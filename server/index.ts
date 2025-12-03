import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleLogin, handleSignup } from "./routes/auth";
import { addToQueue, getQueuedLines, clearQueuedLine } from "./routes/queued";
import { addToHistory, getHistory, searchHistory } from "./routes/history";
import {
  getOrCreateGroupChat,
  sendMessage,
  getMessages,
  addMemberToGroup,
  setTyping,
  getTypingStatus,
  markMessageAsRead,
  editMessage,
  deleteMessage,
} from "./routes/chat";
import { createTeamMember, getTeamMembers } from "./routes/members";
import {
  uploadProfilePicture,
  getProfile,
  updateName,
  changePassword,
} from "./routes/profile";
import {
  getClaimSettings,
  updateClaimSettings,
  claimNumbers,
  getClaimedNumbers,
  releaseClaimedNumbers,
} from "./routes/claim";
import { connectDB } from "./db";
import { authMiddleware } from "./middleware/auth";
import { getCollections } from "./db";

export async function createServer() {
  // Initialize MongoDB connection
  try {
    await connectDB();
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }

  const app = express();

  // Middleware
  const corsOptions = {
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:8080",
      process.env.FRONTEND_URL || "*",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };

  app.use(cors(corsOptions));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Middleware to populate teamId and role from database (after auth middleware)
  app.use((req, res, next) => {
    // This will be set by authMiddleware, we just ensure it's available
    next();
  });

  // Health check endpoint (no auth required)
  app.get("/api/health", (_req, res) => {
    try {
      const collections = getCollections();
      res.json({ status: "ok", database: "connected" });
    } catch (error) {
      res.status(503).json({
        status: "error",
        database: "disconnected",
        error: String(error),
      });
    }
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Authentication routes
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/signup", handleSignup);

  // Queued list routes (protected)
  app.post("/api/queued/add", authMiddleware, addToQueue);
  app.get("/api/queued", authMiddleware, getQueuedLines);
  app.delete("/api/queued/:lineId", authMiddleware, clearQueuedLine);

  // History routes (protected)
  app.post("/api/history/add", authMiddleware, addToHistory);
  app.get("/api/history", authMiddleware, getHistory);
  app.get("/api/history/search", authMiddleware, searchHistory);

  // Chat routes (protected)
  app.get("/api/chat/group", authMiddleware, getOrCreateGroupChat);
  app.post("/api/chat/send", authMiddleware, sendMessage);
  app.get("/api/chat/messages", authMiddleware, getMessages);
  app.post("/api/chat/group/add-member", authMiddleware, addMemberToGroup);
  app.post("/api/chat/typing", authMiddleware, setTyping);
  app.get("/api/chat/typing", authMiddleware, getTypingStatus);
  app.post("/api/chat/mark-read", authMiddleware, markMessageAsRead);
  app.post("/api/chat/edit", authMiddleware, editMessage);
  app.post("/api/chat/delete", authMiddleware, deleteMessage);

  // Member routes (protected)
  app.get("/api/members", authMiddleware, getTeamMembers);
  app.post("/api/members", authMiddleware, createTeamMember);

  // Profile routes (protected)
  app.get("/api/profile", authMiddleware, getProfile);
  app.post("/api/profile/upload-picture", authMiddleware, uploadProfilePicture);
  app.post("/api/profile/update-name", authMiddleware, updateName);
  app.post("/api/profile/change-password", authMiddleware, changePassword);

  // Claim routes (protected)
  app.use("/api/claim", authMiddleware);
  app.get("/api/claim/settings", getClaimSettings);
  app.put("/api/claim/settings", updateClaimSettings);
  app.post("/api/claim", claimNumbers);
  app.get("/api/claim/numbers", getClaimedNumbers);
  app.post("/api/claim/release", releaseClaimedNumbers);

  // Global error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error("[Server] Unhandled error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  });

  return app;
}
