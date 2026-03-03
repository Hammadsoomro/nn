import "dotenv/config";
import express from "express";
import cors, { CorsOptions } from "cors";
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
import { sendAnnouncement, getAnnouncements } from "./routes/announcements";
import { connectDB } from "./db";
import { authMiddleware } from "./middleware/auth";
import { getCollections } from "./db";

export async function createServer() {
  console.log("[Server] Starting server initialization...");
  // Initialize MongoDB connection
  try {
    await connectDB();
    console.log("[Server] Database initialized successfully");
  } catch (error) {
    console.error("[Server] Failed to initialize database:", error);
    // Continue even if database fails, but endpoints will return 500
  }

  const app = express();

  // Middleware
  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // In a serverless environment or local dev, reflect the origin back
      // If no origin (same-site or non-browser), allow it.
      if (!origin) {
        callback(null, true);
        return;
      }
      // For cross-site, reflect the origin
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

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
  // app.get("/api/ping", (_req, res) => {
  //   const ping = process.env.PING_MESSAGE ?? "ping";
  //   res.json({ message: ping });
  // });

  // app.get("/api/demo", handleDemo);

  // Authentication routes
  // app.post("/api/auth/login", handleLogin);
  // app.post("/api/auth/signup", handleSignup);

  // Queued list routes (protected)
  // app.post("/api/queued/add", authMiddleware, addToQueue);
  // app.get("/api/queued", authMiddleware, getQueuedLines);
  // // app.delete("/api/queued/:lineId", authMiddleware, clearQueuedLine);

  // History routes (protected)
  // app.post("/api/history/add", authMiddleware, addToHistory);
  // app.get("/api/history", authMiddleware, getHistory);
  // app.get("/api/history/search", authMiddleware, searchHistory);

  // Chat routes (protected)
  // app.get("/api/chat/group", authMiddleware, getOrCreateGroupChat);
  // app.post("/api/chat/send", authMiddleware, sendMessage);
  // app.get("/api/chat/messages", authMiddleware, getMessages);
  // app.post("/api/chat/group/add-member", authMiddleware, addMemberToGroup);
  // app.post("/api/chat/typing", authMiddleware, setTyping);
  // app.get("/api/chat/typing", authMiddleware, getTypingStatus);
  // app.post("/api/chat/mark-read", authMiddleware, markMessageAsRead);
  // app.post("/api/chat/edit", authMiddleware, editMessage);
  // app.post("/api/chat/delete", authMiddleware, deleteMessage);

  // Member routes (protected)
  // app.get("/api/members", authMiddleware, getTeamMembers);
  // app.post("/api/members", authMiddleware, createTeamMember);

  // Profile routes (protected)
  // app.get("/api/profile", authMiddleware, getProfile);
  // app.post("/api/profile/upload-picture", authMiddleware, uploadProfilePicture);
  // app.post("/api/profile/update-name", authMiddleware, updateName);
  // app.post("/api/profile/change-password", authMiddleware, changePassword);

  // Claim routes (protected)
  // app.get("/api/claim/settings", authMiddleware, getClaimSettings);
  // app.put("/api/claim/settings", authMiddleware, updateClaimSettings);
  // app.post("/api/claim", authMiddleware, claimNumbers);
  // app.get("/api/claim/numbers", authMiddleware, getClaimedNumbers);
  // app.post("/api/claim/release", authMiddleware, releaseClaimedNumbers);

  // Announcements routes (protected)
  // app.post("/api/announcements/send", authMiddleware, sendAnnouncement);
  // app.get("/api/announcements", authMiddleware, getAnnouncements);

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
