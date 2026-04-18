import serverless from "serverless-http";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import crypto from "crypto";
import { MongoClient, ObjectId } from "mongodb";
import * as Ably from "ably";

/* -------------------- BASIC HEALTH -------------------- */
const handleDemo = (req, res) => {
  res.status(200).json({ message: "Hello from Express server" });
};

/* -------------------- DB SETUP -------------------- */
let client = null;
let db = null;
let collections = null;

async function connectDB() {
  if (db) return db;

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI not set");

  client = new MongoClient(mongoUri);
  await client.connect();

  db = client.db("taskflow");

  const usersCollection = db.collection("users");
  const queuedCollection = db.collection("queuedLines");
  const historyCollection = db.collection("history");
  const chatCollection = db.collection("chatMessages");
  const groupCollection = db.collection("chatGroups");
  const settingsCollection = db.collection("claimSettings");
  const claimedCollection = db.collection("claimedNumbers");

  await usersCollection.createIndex({ email: 1 }, { unique: true });
  await usersCollection.createIndex({ teamId: 1 });

  await queuedCollection.createIndex({ teamId: 1 });
  await queuedCollection.createIndex({ content: 1 });

  await historyCollection.createIndex({ teamId: 1 });
  await historyCollection.createIndex({ claimedByUserId: 1 });

  collections = {
    users: usersCollection,
    queuedLines: queuedCollection,
    history: historyCollection,
    chatMessages: chatCollection,
    chatGroups: groupCollection,
    claimSettings: settingsCollection,
    claimedNumbers: claimedCollection
  };

  console.log("MongoDB connected");
  return db;
}

function getCollections() {
  if (!collections) throw new Error("DB not ready");
  return collections;
}

/* -------------------- AUTH HELPERS -------------------- */
const hashPassword = (password) =>
  crypto.createHash("sha256").update(password).digest("hex");

const createToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000
  };

  const secret = process.env.JWT_SECRET || "demo-secret";

  const signature = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload) + secret)
    .digest("hex");

  return `${Buffer.from(JSON.stringify(payload)).toString("base64")}.${signature}`;
};

const verifyToken = (token) => {
  try {
    const [p, s] = token.split(".");
    if (!p || !s) return null;

    const payload = JSON.parse(Buffer.from(p, "base64").toString());

    if (payload.exp < Date.now()) return null;

    const secret = process.env.JWT_SECRET || "demo-secret";

    const expected = crypto
      .createHash("sha256")
      .update(JSON.stringify(payload) + secret)
      .digest("hex");

    if (expected !== s) return null;

    return payload;
  } catch {
    return null;
  }
};

/* -------------------- ABLY (REALTIME) -------------------- */
const ABLY_ROOT_KEY = process.env.ABLY_API_KEY_ROOT;
let ablyInstance = null;

if (ABLY_ROOT_KEY) {
  ablyInstance = new Ably.Rest({ key: ABLY_ROOT_KEY });
  console.log("[Ably] connected");
}

async function publishEvent(channel, event, data) {
  if (!ablyInstance) return;
  try {
    await ablyInstance.channels.get(channel).publish(event, data);
  } catch (e) {
    console.error("Ably error", e);
  }
}

function getIO() {
  return {
    emit: (event, data) => publishEvent("all", event, data),
    to: (channel) => ({
      emit: (event, data) => publishEvent(channel, event, data)
    })
  };
}

/* -------------------- AUTH MIDDLEWARE -------------------- */
const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });

  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "Invalid token" });

  req.userId = decoded.id;
  req.email = decoded.email;
  req.role = decoded.role;

  try {
    const col = getCollections();
    const user = await col.users.findOne({
      _id: new ObjectId(decoded.id)
    });
    if (user) req.teamId = user.teamId;
  } catch {}

  next();
};
/* ===================== AUTH ===================== */
export const handleSignup = async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2)
    });

    const body = schema.parse(req.body);
    const col = getCollections();

    const exists = await col.users.findOne({ email: body.email });
    if (exists) return res.status(400).json({ error: "User exists" });

    const teamId = new ObjectId().toHexString();

    const user = {
      email: body.email,
      name: body.name,
      role: "admin",
      teamId,
      password: hashPassword(body.password),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await col.users.insertOne(user);

    const token = createToken({
      _id: result.insertedId.toString(),
      ...user
    });

    res.status(201).json({
      token,
      user: { ...user, _id: result.insertedId.toString() }
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Signup failed" });
  }
};

export const handleLogin = async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string()
    });

    const body = schema.parse(req.body);

    const col = getCollections();
    const user = await col.users.findOne({
      email: body.email,
      password: hashPassword(body.password)
    });

    if (!user) return res.status(401).json({ error: "Invalid login" });

    const token = createToken({
      _id: user._id.toString(),
      ...user
    });

    res.json({ token, user });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Login failed" });
  }
};

/* ===================== QUEUE SYSTEM ===================== */

export const addToQueue = async (req, res) => {
  try {
    const schema = z.object({
      lines: z.array(z.string()).min(1)
    });

    const { lines } = schema.parse(req.body);
    const col = getCollections();

    const teamId = req.teamId;
    const userId = req.userId;

    const cleaned = lines.map(l => l.trim()).filter(Boolean);

    const existing = await col.queuedLines.find({
      teamId,
      content: { $in: cleaned }
    }).toArray();

    const existingSet = new Set(existing.map(x => x.content.toLowerCase()));

    const toInsert = cleaned
      .filter(l => !existingSet.has(l.toLowerCase()))
      .map(content => ({
        content,
        teamId,
        addedBy: userId,
        addedAt: new Date().toISOString()
      }));

    if (!toInsert.length)
      return res.json({ success: true, inserted: 0 });

    await col.queuedLines.insertMany(toInsert);

    const io = getIO();
    const count = await col.queuedLines.countDocuments({ teamId });

    io.emit("queue-updated", { teamId, count });

    res.json({
      success: true,
      inserted: toInsert.length
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Queue add failed" });
  }
};

export const getQueuedLines = async (req, res) => {
  try {
    const col = getCollections();

    const data = await col.queuedLines
      .find({ teamId: req.teamId })
      .sort({ addedAt: -1 })
      .toArray();

    res.json({ lines: data });
  } catch (e) {
    res.status(500).json({ error: "Fetch failed" });
  }
};

export const clearQueuedLine = async (req, res) => {
  try {
    const col = getCollections();

    await col.queuedLines.deleteOne({
      _id: new ObjectId(req.params.lineId),
      teamId: req.teamId
    });

    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Delete failed" });
  }
};

export const clearAllQueuedLines = async (req, res) => {
  try {
    const col = getCollections();

    await col.queuedLines.deleteMany({
      teamId: req.teamId
    });

    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Clear failed" });
  }
};

/* ===================== DEDUP ===================== */

export const deduplicateLines = async (req, res) => {
  try {
    const schema = z.object({
      lines: z.array(z.string())
    });

    const { lines } = schema.parse(req.body);
    const col = getCollections();

    const cleaned = lines.map(l => l.trim().toLowerCase());

    const seen = new Set();
    const unique = [];

    cleaned.forEach(line => {
      if (!seen.has(line)) {
        seen.add(line);
        unique.push(line);
      }
    });

    res.json({ unique });
  } catch (e) {
    res.status(400).json({ error: "Dedup failed" });
  }
};

/* ===================== HISTORY ===================== */

export const addToHistory = async (req, res) => {
  try {
    const schema = z.object({
      content: z.string(),
      claimedBy: z.string()
    });

    const body = schema.parse(req.body);
    const col = getCollections();

    const entry = {
      ...body,
      teamId: req.teamId,
      claimedByUserId: req.userId,
      claimedAt: new Date().toISOString()
    };

    const result = await col.history.insertOne(entry);

    res.json({
      success: true,
      entry: { ...entry, _id: result.insertedId }
    });
  } catch (e) {
    res.status(400).json({ error: "History failed" });
  }
};

export const getHistory = async (req, res) => {
  try {
    const col = getCollections();

    const filter = { teamId: req.teamId };

    if (req.query.search) {
      filter.content = {
        $regex: req.query.search,
        $options: "i"
      };
    }

    const data = await col.history
      .find(filter)
      .sort({ claimedAt: -1 })
      .toArray();

    res.json({ entries: data });
  } catch (e) {
    res.status(500).json({ error: "History fetch failed" });
  }
};

export const searchHistory = async (req, res) => {
  try {
    const col = getCollections();

    const data = await col.history
      .find({
        teamId: req.teamId,
        content: { $regex: req.query.query, $options: "i" }
      })
      .toArray();

    res.json({ entries: data });
  } catch (e) {
    res.status(500).json({ error: "Search failed" });
  }
};
                
/* ===================== TEAM MEMBERS ===================== */

export const createTeamMember = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2)
    });

    const body = schema.parse(req.body);
    const col = getCollections();

    const exists = await col.users.findOne({
      email: body.email,
      teamId: req.teamId
    });

    if (exists)
      return res.status(400).json({ error: "User exists" });

    const member = {
      email: body.email,
      name: body.name,
      password: hashPassword(body.password),
      role: "member",
      teamId: req.teamId,
      createdBy: req.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await col.users.insertOne(member);

    const newMember = {
      ...member,
      _id: result.insertedId.toString()
    };

    const io = getIO();
    io.emit("member-added", newMember);

    res.status(201).json(newMember);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Create member failed" });
  }
};

export const getTeamMembers = async (req, res) => {
  try {
    const col = getCollections();

    const members = await col.users
      .find({ teamId: req.teamId })
      .toArray();

    res.json(
      members.map(m => ({
        ...m,
        _id: m._id.toString()
      }))
    );
  } catch (e) {
    res.status(500).json({ error: "Fetch members failed" });
  }
};

export const deleteTeamMember = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    const col = getCollections();

    await col.users.deleteOne({
      _id: new ObjectId(req.params.memberId),
      teamId: req.teamId
    });

    const io = getIO();
    io.emit("member-removed", {
      memberId: req.params.memberId,
      teamId: req.teamId
    });

    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Delete failed" });
  }
};

/* ===================== PROFILE ===================== */

export const getProfile = async (req, res) => {
  try {
    const col = getCollections();

    const user = await col.users.findOne({
      _id: new ObjectId(req.userId)
    });

    if (!user)
      return res.status(404).json({ error: "Not found" });

    res.json({
      ...user,
      _id: user._id.toString()
    });
  } catch (e) {
    res.status(500).json({ error: "Profile failed" });
  }
};

export const updateName = async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(2)
    });

    const body = schema.parse(req.body);
    const col = getCollections();

    const result = await col.users.findOneAndUpdate(
      { _id: new ObjectId(req.userId) },
      {
        $set: {
          name: body.name,
          updatedAt: new Date().toISOString()
        }
      },
      { returnDocument: "after" }
    );

    res.json({
      ...result.value,
      _id: result.value._id.toString()
    });
  } catch (e) {
    res.status(400).json({ error: "Update name failed" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const schema = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8)
    });

    const body = schema.parse(req.body);
    const col = getCollections();

    const user = await col.users.findOne({
      _id: new ObjectId(req.userId)
    });

    if (!user)
      return res.status(404).json({ error: "User not found" });

    if (user.password !== hashPassword(body.currentPassword)) {
      return res.status(401).json({ error: "Wrong password" });
    }

    await col.users.updateOne(
      { _id: new ObjectId(req.userId) },
      {
        $set: {
          password: hashPassword(body.newPassword),
          updatedAt: new Date().toISOString()
        }
      }
    );

    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: "Password change failed" });
  }
};

/* ===================== RESET ACCOUNT ===================== */

export const resetAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const col = getCollections();

    const user = await col.users.findOne({
      _id: new ObjectId(req.userId)
    });

    if (!user)
      return res.status(404).json({ error: "User not found" });

    if (user.password !== hashPassword(password)) {
      return res.status(401).json({ error: "Wrong password" });
    }

    await col.history.deleteMany({
      teamId: user.teamId,
      claimedByUserId: req.userId
    });

    await col.queuedLines.deleteMany({
      teamId: user.teamId,
      addedBy: req.userId
    });

    await col.claimedNumbers.deleteMany({
      teamId: user.teamId,
      claimedBy: req.userId
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Reset failed" });
  }
};
  
/* ===================== CLAIM SETTINGS ===================== */

export const getClaimSettings = async (req, res) => {
  try {
    const col = getCollections();

    let settings = await col.claimSettings.findOne({
      teamId: req.teamId
    });

    if (!settings) {
      const newSettings = {
        teamId: req.teamId,
        lineCount: 5,
        cooldownMinutes: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await col.claimSettings.insertOne(newSettings);
      settings = { ...newSettings, _id: result.insertedId };
    }

    res.json({
      ...settings,
      _id: settings._id.toString()
    });
  } catch (e) {
    res.status(500).json({ error: "Settings failed" });
  }
};

export const updateClaimSettings = async (req, res) => {
  try {
    if (req.role !== "admin") {
      return res.status(403).json({ error: "Admin only" });
    }

    const schema = z.object({
      lineCount: z.number().min(1).max(100),
      cooldownMinutes: z.number().min(1).max(1440)
    });

    const body = schema.parse(req.body);
    const col = getCollections();

    const updated = await col.claimSettings.findOneAndUpdate(
      { teamId: req.teamId },
      {
        $set: {
          ...body,
          updatedAt: new Date().toISOString()
        }
      },
      { upsert: true, returnDocument: "after" }
    );

    const io = getIO();
    io.emit("claim-settings-updated", {
      teamId: req.teamId,
      ...body
    });

    res.json(updated.value);
  } catch (e) {
    res.status(400).json({ error: "Update failed" });
  }
};

/* ===================== CLAIM SYSTEM (CORE LOGIC) ===================== */

export const claimNumbers = async (req, res) => {
  try {
    const col = getCollections();

    const user = await col.users.findOne({
      _id: new ObjectId(req.userId)
    });

    if (!user)
      return res.status(404).json({ error: "User not found" });

    const settings = await col.claimSettings.findOne({
      teamId: req.teamId
    });

    const limit = settings?.lineCount || 5;
    const cooldown = settings?.cooldownMinutes || 30;

    const lines = await col.queuedLines
      .find({ teamId: req.teamId })
      .limit(limit)
      .toArray();

    if (!lines.length)
      return res.status(400).json({ error: "No lines" });

    const now = Date.now();
    const cooldownUntil = new Date(
      now + cooldown * 60 * 1000
    ).toISOString();

    const claimed = lines.map(l => ({
      content: l.content,
      teamId: req.teamId,
      claimedBy: req.userId,
      claimedByName: user.name,
      claimedAt: new Date().toISOString(),
      cooldownUntil
    }));

    await col.claimedNumbers.insertMany(claimed);

    await col.history.insertMany(
      claimed.map(c => ({
        content: c.content,
        teamId: req.teamId,
        claimedByUserId: req.userId,
        claimedBy: user.name,
        claimedAt: c.claimedAt
      }))
    );

    await col.queuedLines.deleteMany({
      _id: { $in: lines.map(l => l._id) }
    });

    const io = getIO();

    io.emit("queue-updated", {
      teamId: req.teamId
    });

    res.json({
      success: true,
      claimedCount: claimed.length,
      claimed
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Claim failed" });
  }
};

/* ===================== CLAIMED NUMBERS ===================== */

export const getClaimedNumbers = async (req, res) => {
  try {
    const col = getCollections();

    const data = await col.claimedNumbers
      .find({ teamId: req.teamId })
      .sort({ claimedAt: -1 })
      .toArray();

    res.json(
      data.map(d => ({
        ...d,
        _id: d._id.toString()
      }))
    );
  } catch (e) {
    res.status(500).json({ error: "Fetch failed" });
  }
};

export const releaseClaimedNumbers = async (req, res) => {
  try {
    const col = getCollections();

    await col.claimedNumbers.deleteMany({
      teamId: req.teamId,
      claimedBy: req.userId
    });

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Release failed" });
  }
};

/* ===================== EXPRESS APP ===================== */

async function createServer() {
  await connectDB();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));

  /* ROUTES */
  app.get("/api/demo", handleDemo);

  app.post("/api/auth/signup", handleSignup);
  app.post("/api/auth/login", handleLogin);

  app.use(authMiddleware);

  app.post("/api/queue/add", addToQueue);
  app.get("/api/queue", getQueuedLines);
  app.delete("/api/queue", clearAllQueuedLines);
  app.delete("/api/queue/:lineId", clearQueuedLine);

  app.post("/api/queue/dedup", deduplicateLines);

  app.post("/api/history/add", addToHistory);
  app.get("/api/history", getHistory);
  app.get("/api/history/search", searchHistory);

  app.post("/api/members", createTeamMember);
  app.get("/api/members", getTeamMembers);
  app.delete("/api/members/:memberId", deleteTeamMember);

  app.get("/api/profile", getProfile);
  app.post("/api/profile/name", updateName);
  app.post("/api/profile/password", changePassword);
  app.post("/api/profile/reset", resetAccount);

  app.get("/api/claim/settings", getClaimSettings);
  app.put("/api/claim/settings", updateClaimSettings);

  app.post("/api/claim", claimNumbers);
  app.get("/api/claimed", getClaimedNumbers);
  app.post("/api/claimed/release", releaseClaimedNumbers);

  return app;
}

/* ===================== NETLIFY HANDLER ===================== */

let cachedHandler;

export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!cachedHandler) {
    const app = await createServer();
    cachedHandler = serverless(app);
  }

  return cachedHandler(event, context);
};
