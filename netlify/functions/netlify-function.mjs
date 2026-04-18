import serverless from "serverless-http";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import crypto from "crypto";
import { MongoClient, ObjectId } from "mongodb";
import * as Ably from "ably";

/* =========================
   BASIC EXPRESS SETUP
========================= */

const app = express();

app.use(cors({
  origin: "*",
  credentials: true
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));

/* =========================
   SAFE RESPONSE HELPER
========================= */

const send = (res, status, data) => {
  res.status(status).json(data);
};

/* =========================
   MONGODB CONNECTION
========================= */

let client = null;
let db = null;
let collections = null;

async function connectDB() {
  if (db) return db;

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI missing");

  client = new MongoClient(mongoUri);
  await client.connect();

  db = client.db("taskflow");

  collections = {
    users: db.collection("users"),
    queuedLines: db.collection("queuedLines"),
    history: db.collection("history"),
    chatMessages: db.collection("chatMessages"),
    chatGroups: db.collection("chatGroups"),
    claimSettings: db.collection("claimSettings"),
    claimedNumbers: db.collection("claimedNumbers")
  };

  console.log("MongoDB connected");
  return db;
}

const getCollections = () => {
  if (!collections) throw new Error("DB not ready");
  return collections;
};

/* =========================
   AUTH HELPERS
========================= */

const hashPassword = (p) =>
  crypto.createHash("sha256").update(p).digest("hex");

const createToken = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000
  };

  const secret = process.env.JWT_SECRET || "demo";
  const signature = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload) + secret)
    .digest("hex");

  return `${Buffer.from(JSON.stringify(payload)).toString("base64")}.${signature}`;
};

const verifyToken = (token) => {
  try {
    const [p, s] = token.split(".");
    const payload = JSON.parse(Buffer.from(p, "base64").toString());

    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
};

/* =========================
   AUTH MIDDLEWARE
========================= */

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return send(res, 401, { error: "No token" });

    const decoded = verifyToken(token);
    if (!decoded) return send(res, 401, { error: "Invalid token" });

    req.userId = decoded.id;
    req.email = decoded.email;
    req.role = decoded.role;

    const col = getCollections();
    const user = await col.users.findOne({ _id: new ObjectId(decoded.id) });

    if (user) req.teamId = user.teamId;

    next();
  } catch (e) {
    return send(res, 401, { error: "Auth failed" });
  }
};

/* =========================
   INIT DB BEFORE ROUTES
========================= */

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (e) {
    return send(res, 500, { error: "DB init failed" });
  }
});

/* =========================
   ROUTES
========================= */

app.get("/api/health", (req, res) => {
  send(res, 200, { status: "ok" });
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const col = getCollections();

    const exists = await col.users.findOne({ email });
    if (exists) return send(res, 400, { error: "User exists" });

    const teamId = new ObjectId().toHexString();

    const user = {
      email,
      name,
      password: hashPassword(password),
      role: "admin",
      teamId
    };

    const result = await col.users.insertOne(user);

    send(res, 201, {
      token: createToken({ ...user, _id: result.insertedId }),
      user
    });
  } catch (e) {
    send(res, 500, { error: "Signup failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const col = getCollections();

    const user = await col.users.findOne({
      email,
      password: hashPassword(password)
    });

    if (!user) return send(res, 401, { error: "Invalid credentials" });

    send(res, 200, {
      token: createToken(user),
      user
    });
  } catch (e) {
    send(res, 500, { error: "Login failed" });
  }
});

/* =========================
   SAMPLE PROTECTED ROUTE
========================= */

app.get("/api/profile", auth, async (req, res) => {
  const col = getCollections();

  const user = await col.users.findOne({
    _id: new ObjectId(req.userId)
  });

  send(res, 200, user);
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: "Server error"
  });
});

/* =========================
   NETLIFY HANDLER (IMPORTANT FIX)
========================= */

let handler;

export const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!handler) {
    handler = serverless(app);
  }

  return handler(event, context);
};
