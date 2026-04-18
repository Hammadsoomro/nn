import serverless from "serverless-http";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import crypto from "crypto";
import { MongoClient, ObjectId } from "mongodb";
import * as Ably from "ably";
const handleDemo = (req, res) => {
  const response = {
    message: "Hello from Express server"
  };
  res.status(200).json(response);
};
let client = null;
let db = null;
let collections = null;
async function connectDB() {
  if (db) {
    return db;
  }
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI environment variable is not set. Please set it in your environment variables."
    );
  }
  try {
    client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db("taskflow");
    const usersCollection = db.collection("users");
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ teamId: 1 });
    const queuedCollection = db.collection("queuedLines");
    await queuedCollection.createIndex({ teamId: 1 });
    await queuedCollection.createIndex({ content: 1 });
    await queuedCollection.createIndex({ addedAt: -1 });
    const historyCollection = db.collection("history");
    await historyCollection.createIndex({ teamId: 1 });
    await historyCollection.createIndex({ content: 1 });
    await historyCollection.createIndex({ claimedBy: 1 });
    await historyCollection.createIndex({ claimedAt: -1 });
    const chatCollection = db.collection("chatMessages");
    await chatCollection.createIndex({ teamId: 1 });
    await chatCollection.createIndex({ createdAt: -1 });
    const groupCollection = db.collection("chatGroups");
    await groupCollection.createIndex({ teamId: 1 });
    const settingsCollection = db.collection("claimSettings");
    await settingsCollection.createIndex({ teamId: 1 });
    const claimedCollection = db.collection("claimedNumbers");
    await claimedCollection.createIndex({ teamId: 1 });
    await claimedCollection.createIndex({ claimedBy: 1 });
    await claimedCollection.createIndex({ claimedAt: -1 });
    collections = {
      users: usersCollection,
      queuedLines: queuedCollection,
      history: historyCollection,
      chatMessages: chatCollection,
      chatGroups: groupCollection,
      claimSettings: settingsCollection,
      claimedNumbers: claimedCollection
    };
    console.log("MongoDB connected successfully");
    return db;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}
function getCollections() {
  if (!collections) {
    throw new Error("Collections not initialized. Call connectDB first.");
  }
  return collections;
}
const hashPassword$2 = (password) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};
const createToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1e3
    // 7 days
  };
  const jwtSecret = process.env.JWT_SECRET || "demo-secret";
  const signature = crypto.createHash("sha256").update(JSON.stringify(payload) + jwtSecret).digest("hex");
  return `${Buffer.from(JSON.stringify(payload)).toString("base64")}.${signature}`;
};
const handleSignup = async (req, res) => {
  try {
    const body = req.body;
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2)
    });
    const validated = schema.parse(body);
    try {
      const collections2 = getCollections();
      const existing = await collections2.users.findOne({
        email: validated.email
      });
      if (existing) {
        res.status(400).json({ error: "User already exists" });
        return;
      }
      const teamId = new ObjectId().toHexString();
      const hashedPassword = hashPassword$2(validated.password);
      const result = await collections2.users.insertOne({
        email: validated.email,
        name: validated.name,
        role: "admin",
        teamId,
        password: hashedPassword,
        profilePicture: void 0,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      const newUser = {
        _id: result.insertedId.toString(),
        email: validated.email,
        name: validated.name,
        role: "admin",
        teamId,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const token = createToken(newUser);
      const response = { token, user: newUser };
      res.status(201).json(response);
    } catch (dbError) {
      console.error("Database error in signup:", dbError);
      res.status(500).json({ error: "Database is not configured" });
    }
  } catch (error) {
    console.error("Signup error:", error);
    res.status(400).json({ error: "Invalid request" });
  }
};
const handleLogin = async (req, res) => {
  try {
    const body = req.body;
    const schema = z.object({
      email: z.string().email(),
      password: z.string()
    });
    const validated = schema.parse(body);
    const hashedPassword = hashPassword$2(validated.password);
    try {
      const collections2 = getCollections();
      const userRecord = await collections2.users.findOne({
        email: validated.email,
        password: hashedPassword
      });
      if (!userRecord) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const user = {
        _id: userRecord._id.toString(),
        email: userRecord.email,
        name: userRecord.name,
        role: userRecord.role,
        teamId: userRecord.teamId,
        createdAt: userRecord.createdAt,
        updatedAt: userRecord.updatedAt
      };
      const token = createToken(user);
      const response = { token, user };
      res.json(response);
    } catch (dbError) {
      console.error("Database error in login:", dbError);
      res.status(500).json({ error: "Database is not configured" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(400).json({ error: "Invalid request" });
  }
};
const verifyToken = (token) => {
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return null;
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64").toString()
    );
    if (payload.exp < Date.now()) return null;
    const jwtSecret = process.env.JWT_SECRET || "demo-secret";
    const expectedSignature = crypto.createHash("sha256").update(JSON.stringify(payload) + jwtSecret).digest("hex");
    if (signature !== expectedSignature) return null;
    return { id: payload.id, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
};
const ABLY_ROOT_KEY = process.env.ABLY_API_KEY_ROOT;
let ablyInstance = null;
if (ABLY_ROOT_KEY) {
  ablyInstance = new Ably.Rest({ key: ABLY_ROOT_KEY });
  console.log("[Ably] Root instance initialized on server");
} else {
  console.warn("[Ably] ABLY_API_KEY_ROOT not found, real-time events will not be published");
}
async function publishEvent(channelName, eventName, data) {
  if (!ablyInstance) return;
  try {
    const channel = ablyInstance.channels.get(channelName);
    await channel.publish(eventName, data);
    console.log(`[Ably] Published ${eventName} to channel ${channelName}`);
  } catch (error) {
    console.error(`[Ably] Error publishing ${eventName} to channel ${channelName}:`, error);
  }
}
function getIO() {
  return {
    emit: (eventName, data) => publishEvent("all", eventName, data),
    to: (channelName) => ({
      emit: (eventName, data) => publishEvent(channelName, eventName, data)
    })
  };
}
const addToQueue = async (req, res) => {
  try {
    const schema = z.object({
      lines: z.array(z.string()).min(1)
    });
    const validated = schema.parse(req.body);
    const teamId = req.teamId;
    const userId = req.userId;
    if (!teamId || !userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const collections2 = getCollections();
    const inputLines = validated.lines.map((l) => l.trim()).filter((l) => l);
    if (inputLines.length === 0) {
      res.status(400).json({ error: "No valid lines to add" });
      return;
    }
    const inputLinesLower = inputLines.map((l) => l.toLowerCase());
    const existingQueued = await collections2.queuedLines.find({
      teamId,
      content: { $in: inputLines }
    }).project({ content: 1 }).toArray();
    const existingHistory = await collections2.history.find({
      teamId,
      content: { $in: inputLines }
    }).project({ content: 1 }).toArray();
    const queuedSet = new Set(
      existingQueued.map((l) => l.content.toLowerCase())
    );
    const historySet = new Set(
      existingHistory.map((l) => l.content.toLowerCase())
    );
    const uniqueLines = [];
    const localSeen = /* @__PURE__ */ new Set();
    inputLines.forEach((line) => {
      const lowerLine = line.toLowerCase();
      if (!localSeen.has(lowerLine) && !queuedSet.has(lowerLine) && !historySet.has(lowerLine)) {
        localSeen.add(lowerLine);
        uniqueLines.push(line);
      }
    });
    if (uniqueLines.length === 0) {
      res.json({
        success: true,
        count: 0,
        message: "All lines were already in the queue or history"
      });
      return;
    }
    const linesToInsert = uniqueLines.map((content) => ({
      content,
      addedBy: userId,
      addedAt: (/* @__PURE__ */ new Date()).toISOString(),
      teamId
    }));
    const result = await collections2.queuedLines.insertMany(linesToInsert);
    const io = getIO();
    if (io) {
      const count = await collections2.queuedLines.countDocuments({ teamId });
      io.emit("lines-queued-updated", {
        count,
        teamId
      });
    }
    res.json({
      success: true,
      count: result.insertedCount,
      skipped: inputLines.length - uniqueLines.length
    });
  } catch (error) {
    console.error("Add to queue error:", error);
    res.status(400).json({ error: "Invalid request" });
  }
};
const getQueuedLines = async (req, res) => {
  try {
    const teamId = req.teamId;
    if (!teamId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const collections2 = getCollections();
    const lines = await collections2.queuedLines.find({ teamId }).sort({ addedAt: -1 }).toArray();
    const formattedLines = lines.map((line) => ({
      _id: line._id.toString(),
      content: line.content,
      addedBy: line.addedBy,
      addedAt: line.addedAt,
      teamId: line.teamId
    }));
    res.json({ lines: formattedLines });
  } catch (error) {
    console.error("Get queued lines error:", error);
    res.status(400).json({ error: "Failed to fetch queued lines" });
  }
};
const clearQueuedLine = async (req, res) => {
  try {
    const { lineId } = req.params;
    const teamId = req.teamId;
    if (!teamId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const collections2 = getCollections();
    const result = await collections2.queuedLines.deleteOne({
      _id: new ObjectId(lineId),
      teamId
    });
    if (result.deletedCount > 0) {
      const io = getIO();
      if (io) {
        const count = await collections2.queuedLines.countDocuments({ teamId });
        io.emit("lines-queued-updated", { count, teamId });
      }
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Line not found" });
    }
  } catch (error) {
    console.error("Clear queued line error:", error);
    res.status(400).json({ error: "Failed to delete line" });
  }
};
const clearAllQueuedLines = async (req, res) => {
  try {
    const teamId = req.teamId;
    if (!teamId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const collections2 = getCollections();
    await collections2.queuedLines.deleteMany({ teamId });
    const io = getIO();
    if (io) {
      io.emit("lines-queued-updated", { count: 0, teamId });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Clear all queued lines error:", error);
    res.status(400).json({ error: "Failed to clear queued list" });
  }
};
const deduplicateLines = async (req, res) => {
  try {
    const schema = z.object({
      lines: z.array(z.string())
    });
    const validated = schema.parse(req.body);
    const teamId = req.teamId;
    if (!teamId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const collections2 = getCollections();
    const inputLines = validated.lines.map((l) => l.trim().toLowerCase()).filter((l) => l);
    if (inputLines.length === 0) {
      res.json({ unique: [] });
      return;
    }
    const existingQueued = await collections2.queuedLines.find({ teamId, content: { $in: inputLines } }).project({ content: 1 }).toArray();
    const existingHistory = await collections2.history.find({ teamId, content: { $in: inputLines } }).project({ content: 1 }).toArray();
    const queuedSet = new Set(existingQueued.map((l) => l.content.toLowerCase()));
    const historySet = new Set(existingHistory.map((l) => l.content.toLowerCase()));
    const getFirstWords = (text) => text.split(/\s+/).slice(0, 15).join(" ");
    const seen = /* @__PURE__ */ new Set();
    const unique = [];
    validated.lines.forEach((line) => {
      const trimmedLine = line.trim().toLowerCase();
      if (!trimmedLine) return;
      const key = getFirstWords(trimmedLine);
      if (!seen.has(key) && !queuedSet.has(trimmedLine) && !historySet.has(trimmedLine)) {
        seen.add(key);
        unique.push(line);
      }
    });
    res.json({ unique });
  } catch (error) {
    console.error("Deduplicate lines error:", error);
    res.status(400).json({ error: "Failed to deduplicate lines" });
  }
};
const addToHistory = async (req, res) => {
  try {
    const schema = z.object({
      content: z.string(),
      claimedBy: z.string()
    });
    const validated = schema.parse(req.body);
    const teamId = req.teamId || "default-team";
    const collections2 = getCollections();
    const result = await collections2.history.insertOne({
      content: validated.content,
      claimedBy: validated.claimedBy,
      claimedByUserId: req.userId,
      claimedAt: (/* @__PURE__ */ new Date()).toISOString(),
      teamId
    });
    const entry = {
      _id: result.insertedId.toString(),
      content: validated.content,
      claimedBy: validated.claimedBy,
      claimedByUserId: req.userId,
      claimedAt: (/* @__PURE__ */ new Date()).toISOString(),
      teamId
    };
    res.json({ success: true, entry });
  } catch (error) {
    console.error("Add to history error:", error);
    res.status(400).json({ error: "Invalid request" });
  }
};
const getHistory = async (req, res) => {
  try {
    const teamId = req.teamId || "default-team";
    const userId = req.userId || "";
    const isAdmin = req.role === "admin";
    const { search, date } = req.query;
    const collections2 = getCollections();
    const filter = { teamId };
    if (!isAdmin && userId) {
      filter.claimedByUserId = userId;
    }
    if (search && typeof search === "string") {
      filter.content = { $regex: search, $options: "i" };
    }
    if (date && typeof date === "string") {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.claimedAt = {
        $gte: startDate.toISOString(),
        $lte: endDate.toISOString()
      };
    }
    const entries = await collections2.history.find(filter).sort({ claimedAt: -1 }).toArray();
    const formattedEntries = entries.map((entry) => ({
      _id: entry._id.toString(),
      content: entry.content,
      claimedBy: entry.claimedBy,
      claimedAt: entry.claimedAt,
      teamId: entry.teamId
    }));
    res.json({ entries: formattedEntries });
  } catch (error) {
    console.error("Get history error:", error);
    res.status(400).json({ error: "Failed to fetch history" });
  }
};
const searchHistory = async (req, res) => {
  try {
    const teamId = req.teamId || "default-team";
    const { query } = req.query;
    if (!query || typeof query !== "string") {
      res.status(400).json({ error: "Query required" });
      return;
    }
    const collections2 = getCollections();
    const entries = await collections2.history.find({
      teamId,
      content: { $regex: query, $options: "i" }
    }).sort({ claimedAt: -1 }).toArray();
    const formattedEntries = entries.map((entry) => ({
      _id: entry._id.toString(),
      content: entry.content,
      claimedBy: entry.claimedBy,
      claimedAt: entry.claimedAt,
      teamId: entry.teamId
    }));
    res.json({ entries: formattedEntries });
  } catch (error) {
    console.error("Search history error:", error);
    res.status(400).json({ error: "Search failed" });
  }
};
const hashPassword$1 = (password) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};
const createTeamMember = async (req, res) => {
  try {
    if (!req.teamId) {
      res.status(401).json({ error: "Team not found" });
      return;
    }
    if (req.role !== "admin") {
      res.status(403).json({ error: "Only admins can create team members" });
      return;
    }
    const { email, password, name } = req.body;
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2)
    });
    const validated = schema.parse({ email, password, name });
    const collections2 = getCollections();
    const existing = await collections2.users.findOne({
      email: validated.email
    });
    if (existing) {
      res.status(400).json({ error: "User already exists" });
      return;
    }
    const hashedPassword = hashPassword$1(validated.password);
    const result = await collections2.users.insertOne({
      email: validated.email,
      name: validated.name,
      password: hashedPassword,
      role: "member",
      teamId: req.teamId,
      createdBy: req.userId,
      profilePicture: void 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const newUser = {
      _id: result.insertedId.toString(),
      email: validated.email,
      name: validated.name,
      role: "member",
      teamId: req.teamId,
      createdBy: req.userId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const groupChat = await collections2.chatGroups.findOne({
      teamId: req.teamId,
      name: "Team Chat"
    });
    if (groupChat) {
      await collections2.chatGroups.findOneAndUpdate(
        { _id: groupChat._id },
        {
          $addToSet: { members: newUser._id }
        }
      );
    }
    const io = getIO();
    if (io) {
      io.emit("member-added", newUser);
    }
    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating team member:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.errors });
      return;
    }
    res.status(400).json({ error: "Failed to create team member" });
  }
};
const getTeamMembers = async (req, res) => {
  try {
    if (!req.teamId) {
      res.status(401).json({ error: "Team not found" });
      return;
    }
    const collections2 = getCollections();
    const members = await collections2.users.find({ teamId: req.teamId }).toArray();
    const formattedMembers = members.map((member) => {
      return {
        _id: member._id.toString(),
        email: member.email,
        name: member.name,
        role: member.role,
        profilePicture: member.profilePicture,
        createdBy: member.createdBy,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        totalClaims: 0,
        claimsToday: 0
      };
    });
    res.json(formattedMembers);
  } catch (error) {
    console.error("Error getting team members:", error);
    res.status(500).json({ error: "Failed to get team members" });
  }
};
const deleteTeamMember = async (req, res) => {
  try {
    if (!req.teamId) {
      res.status(401).json({ error: "Team not found" });
      return;
    }
    if (req.role !== "admin") {
      res.status(403).json({ error: "Only admins can delete team members" });
      return;
    }
    const { memberId } = req.params;
    if (!memberId) {
      res.status(400).json({ error: "Member ID is required" });
      return;
    }
    const collections2 = getCollections();
    const member = await collections2.users.findOne({
      _id: new ObjectId(memberId),
      teamId: req.teamId
    });
    if (!member) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }
    if (member._id.toString() === req.userId) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }
    await collections2.users.deleteOne({
      _id: new ObjectId(memberId),
      teamId: req.teamId
    });
    try {
      await collections2.chatGroups.updateMany(
        { teamId: req.teamId },
        { $pull: { members: { $eq: memberId } } }
      );
    } catch (error) {
      console.error("Error updating chat groups:", error);
    }
    const io = getIO();
    if (io) {
      io.emit("team-members-updated", { teamId: req.teamId });
    }
    res.json({ success: true, message: "Team member deleted successfully" });
  } catch (error) {
    console.error("Error deleting team member:", error);
    res.status(500).json({ error: "Failed to delete team member" });
  }
};
const hashPassword = (password) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.userId) {
      console.error("Upload failed: No userId in request");
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const { profilePictureUrl } = req.body;
    if (!profilePictureUrl) {
      console.error("Upload failed: No profilePictureUrl provided");
      res.status(400).json({ error: "Profile picture URL is required" });
      return;
    }
    const collections2 = getCollections();
    const result = await collections2.users.findOneAndUpdate(
      { _id: new ObjectId(req.userId) },
      {
        $set: {
          profilePictureUrl,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      },
      { returnDocument: "after" }
    );
    if (!result.value) {
      console.error("Upload failed: User not found for userId:", req.userId);
      res.status(404).json({ error: "User not found" });
      return;
    }
    const updatedUser = {
      _id: result.value._id.toString(),
      email: result.value.email,
      name: result.value.name,
      role: result.value.role,
      profilePictureUrl: result.value.profilePictureUrl,
      teamId: result.value.teamId,
      createdAt: result.value.createdAt,
      updatedAt: result.value.updatedAt
    };
    res.json(updatedUser);
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    res.status(500).json({ error: "Failed to upload profile picture" });
  }
};
const getProfile = async (req, res) => {
  try {
    const collections2 = getCollections();
    const user = await collections2.users.findOne({
      _id: new ObjectId(req.userId)
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const userProfile = {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      profilePictureUrl: user.profilePictureUrl,
      teamId: user.teamId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    res.json(userProfile);
  } catch (error) {
    console.error("Error getting profile:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
};
const updateName = async (req, res) => {
  try {
    const { name } = req.body;
    const schema = z.object({
      name: z.string().min(2)
    });
    const validated = schema.parse({ name });
    const collections2 = getCollections();
    const result = await collections2.users.findOneAndUpdate(
      { _id: new ObjectId(req.userId) },
      {
        $set: {
          name: validated.name,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      },
      { returnDocument: "after" }
    );
    if (!result.value) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const updatedUser = {
      _id: result.value._id.toString(),
      email: result.value.email,
      name: result.value.name,
      role: result.value.role,
      profilePictureUrl: result.value.profilePictureUrl,
      teamId: result.value.teamId,
      createdAt: result.value.createdAt,
      updatedAt: result.value.updatedAt
    };
    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating name:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    res.status(500).json({ error: "Failed to update name" });
  }
};
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8)
    });
    const validated = schema.parse({ currentPassword, newPassword });
    const collections2 = getCollections();
    const user = await collections2.users.findOne({
      _id: new ObjectId(req.userId)
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const hashedCurrentPassword = hashPassword(validated.currentPassword);
    if (hashedCurrentPassword !== user.password) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    const hashedNewPassword = hashPassword(validated.newPassword);
    const result = await collections2.users.findOneAndUpdate(
      { _id: new ObjectId(req.userId) },
      {
        $set: {
          password: hashedNewPassword,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      },
      { returnDocument: "after" }
    );
    if (!result.value) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    res.status(500).json({ error: "Failed to change password" });
  }
};
const resetAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ error: "Password is required to reset account" });
      return;
    }
    const collections2 = getCollections();
    const user = await collections2.users.findOne({
      _id: new ObjectId(req.userId)
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const hashedPassword = hashPassword(password);
    if (hashedPassword !== user.password) {
      res.status(401).json({ error: "Password is incorrect" });
      return;
    }
    const teamId = user.teamId;
    await collections2.claimedNumbers.deleteMany({
      teamId,
      claimedBy: req.userId
    });
    await collections2.history.deleteMany({
      teamId,
      claimedByUserId: req.userId
    });
    await collections2.queuedLines.deleteMany({
      teamId,
      addedBy: req.userId
    });
    res.json({
      message: "Account data reset successfully",
      success: true
    });
  } catch (error) {
    console.error("Error resetting account:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    res.status(500).json({ error: "Failed to reset account" });
  }
};
const getClaimSettings = async (req, res) => {
  try {
    const teamId = req.teamId;
    if (!teamId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const collections2 = getCollections();
    let settings = await collections2.claimSettings.findOne({ teamId });
    if (!settings) {
      const result = await collections2.claimSettings.insertOne({
        teamId,
        lineCount: 5,
        cooldownMinutes: 30,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      settings = {
        _id: result.insertedId,
        teamId,
        lineCount: 5,
        cooldownMinutes: 30,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    res.json({
      _id: settings._id.toString(),
      teamId: settings.teamId,
      lineCount: settings.lineCount,
      cooldownMinutes: settings.cooldownMinutes
    });
  } catch (error) {
    console.error("Get claim settings error:", error);
    res.status(500).json({ error: "Failed to get claim settings" });
  }
};
const updateClaimSettings = async (req, res) => {
  try {
    const teamId = req.teamId;
    const role = req.role;
    if (!teamId || role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    const schema = z.object({
      lineCount: z.number().min(1).max(100),
      cooldownMinutes: z.number().min(0.5).max(1440)
    });
    const validated = schema.parse(req.body);
    const collections2 = getCollections();
    const result = await collections2.claimSettings.findOneAndUpdate(
      { teamId },
      {
        $set: {
          lineCount: validated.lineCount,
          cooldownMinutes: validated.cooldownMinutes,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      },
      { returnDocument: "after", upsert: true }
    );
    const io = getIO();
    if (io) {
      io.emit("claim-settings-updated", {
        teamId,
        lineCount: result.value?.lineCount,
        cooldownMinutes: result.value?.cooldownMinutes
      });
    }
    res.json({
      _id: result.value?._id.toString(),
      teamId: result.value?.teamId,
      lineCount: result.value?.lineCount,
      cooldownMinutes: result.value?.cooldownMinutes
    });
  } catch (error) {
    console.error("Update claim settings error:", error);
    res.status(400).json({ error: "Invalid request" });
  }
};
const claimNumbers = async (req, res) => {
  try {
    const teamId = req.teamId;
    const userId = req.userId;
    if (!teamId || !userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const collections2 = getCollections();
    await collections2.claimedNumbers.deleteMany({
      teamId,
      claimedBy: userId
    });
    const user = await collections2.users.findOne({
      _id: new ObjectId(userId)
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const settings = await collections2.claimSettings.findOne({ teamId });
    const lineCount = settings?.lineCount || 5;
    const cooldownMinutes = settings?.cooldownMinutes || 30;
    const availableLines = await collections2.queuedLines.find({ teamId }).limit(lineCount).toArray();
    if (availableLines.length === 0) {
      res.status(400).json({ error: "No lines available to claim" });
      return;
    }
    const claimedLineIds = availableLines.map((line) => line._id);
    const claimedAt = (/* @__PURE__ */ new Date()).toISOString();
    const cooldownUntil = new Date(
      Date.now() + cooldownMinutes * 60 * 1e3
    ).toISOString();
    const claimedRecords = availableLines.map((line) => ({
      content: line.content,
      claimedBy: userId,
      claimedByName: user.name,
      claimedAt,
      cooldownUntil,
      teamId
    }));
    const claimResult = await collections2.claimedNumbers.insertMany(claimedRecords);
    const historyRecords = availableLines.map((line) => ({
      content: line.content,
      claimedBy: user.name,
      claimedByUserId: userId,
      claimedAt,
      teamId
    }));
    await collections2.history.insertMany(historyRecords);
    await collections2.queuedLines.deleteMany({
      _id: { $in: claimedLineIds }
    });
    const io = getIO();
    if (io) {
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = today.toISOString();
      const claimedTodayCount = await collections2.claimedNumbers.countDocuments({
        teamId,
        claimedBy: userId,
        claimedAt: { $gte: todayString }
      });
      io.emit("claimed-today-updated", {
        count: claimedTodayCount,
        teamId,
        userId
      });
      const queuedLinesCount = await collections2.queuedLines.countDocuments({ teamId });
      io.emit("lines-queued-updated", {
        count: queuedLinesCount,
        teamId
      });
    }
    const response = {
      success: true,
      claimedCount: availableLines.length,
      claimedLines: availableLines.map((line, idx) => ({
        _id: claimResult.insertedIds[idx].toString(),
        content: line.content,
        claimedAt,
        cooldownUntil
      }))
    };
    res.json(response);
  } catch (error) {
    console.error("Claim numbers error:", error);
    res.status(500).json({ error: "Failed to claim numbers" });
  }
};
const getClaimedNumbers = async (req, res) => {
  try {
    const teamId = req.teamId;
    const userId = req.userId;
    if (!teamId || !userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const collections2 = getCollections();
    const claimedNumbers = await collections2.claimedNumbers.find({
      teamId,
      claimedBy: userId
    }).sort({ claimedAt: -1 }).toArray();
    const formatted = claimedNumbers.map((claim) => ({
      _id: claim._id.toString(),
      content: claim.content,
      claimedAt: claim.claimedAt,
      cooldownUntil: claim.cooldownUntil
    }));
    res.json(formatted);
  } catch (error) {
    console.error("Get claimed numbers error:", error);
    res.status(500).json({ error: "Failed to get claimed numbers" });
  }
};
const releaseClaimedNumbers = async (req, res) => {
  try {
    const teamId = req.teamId;
    const userId = req.userId;
    if (!teamId || !userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const collections2 = getCollections();
    await collections2.claimedNumbers.deleteMany({
      teamId,
      claimedBy: userId
    });
    const io = getIO();
    if (io) {
      io.emit("claimed-today-updated", {
        count: 0,
        teamId,
        userId
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Release claimed numbers error:", error);
    res.status(500).json({ error: "Failed to release claimed numbers" });
  }
};
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ error: "No token provided" });
      return;
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    req.userId = decoded.id;
    req.email = decoded.email;
    req.role = decoded.role;
    try {
      const collections2 = getCollections();
      let user = await collections2.users.findOne({
        _id: new ObjectId(decoded.id)
      });
      if (user) {
        req.teamId = user.teamId;
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
};
async function createServer() {
  console.log("[Server] Starting server initialization...");
  try {
    await connectDB();
    console.log("[Server] Database initialized successfully");
  } catch (error) {
    console.error("[Server] Failed to initialize database:", error);
  }
  const app = express();
  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    preflightContinue: false,
    optionsSuccessStatus: 204
  };
  app.use(cors(corsOptions));
  app.use((req, res, next) => {
    console.log(`[Server] ${req.method} ${req.path}`);
    next();
  });
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.get("/api/health", (_req, res) => {
    try {
      const collections2 = getCollections();
      res.json({ status: "ok", database: "connected" });
    } catch (error) {
      res.status(503).json({
        status: "error",
        database: "disconnected",
        error: String(error)
      });
    }
  });
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });
  app.get("/api/demo", handleDemo);
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/signup", handleSignup);
  app.post("/api/queued/add", authMiddleware, addToQueue);
  app.get("/api/queued", authMiddleware, getQueuedLines);
  app.delete("/api/queued", authMiddleware, clearAllQueuedLines);
  app.delete("/api/queued/:lineId", authMiddleware, clearQueuedLine);
  app.post("/api/queued/deduplicate", authMiddleware, deduplicateLines);
  app.post("/api/history/add", authMiddleware, addToHistory);
  app.get("/api/history", authMiddleware, getHistory);
  app.get("/api/history/search", authMiddleware, searchHistory);
  app.get("/api/members", authMiddleware, getTeamMembers);
  app.post("/api/members", authMiddleware, createTeamMember);
  app.delete("/api/members/:memberId", authMiddleware, deleteTeamMember);
  app.get("/api/profile", authMiddleware, getProfile);
  app.post("/api/profile/upload-picture", authMiddleware, uploadProfilePicture);
  app.post("/api/profile/update-name", authMiddleware, updateName);
  app.post("/api/profile/change-password", authMiddleware, changePassword);
  app.post("/api/profile/reset-account", authMiddleware, resetAccount);
  app.get("/api/claim/settings", authMiddleware, getClaimSettings);
  app.put("/api/claim/settings", authMiddleware, updateClaimSettings);
  app.post("/api/claim", authMiddleware, claimNumbers);
  app.get("/api/claim/numbers", authMiddleware, getClaimedNumbers);
  app.post("/api/claim/release", authMiddleware, releaseClaimedNumbers);
  app.use((err, _req, res, _next) => {
    console.error("[Server] Unhandled error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: void 0
    });
  });
  return app;
}
let cachedHandler = null;
const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  if (!cachedHandler) {
    try {
      const app = await createServer();
      cachedHandler = serverless(app, {
        binary: ["image/*", "font/*", "application/octet-stream"]
      });
    } catch (error) {
      console.error("[Server] Critical initialization error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Critical server initialization error",
          message: String(error)
        })
      };
    }
  }
  try {
    return await cachedHandler(event, context);
  } catch (error) {
    console.error("[Server] Request processing error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error during request processing",
        message: String(error)
      })
    };
  }
};
export {
  handler
};
//# sourceMappingURL=netlify-function.mjs.map
