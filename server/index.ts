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
  // Initialize MongoDB connection
  try {
    await connectDB();
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }

  const app = express();
  const apiRouter = express.Router();

  // Middleware
  const corsOptions: CorsOptions = {
    origin: true, // Reflect the request origin back to the client
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };

  app.use(cors(corsOptions));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health check endpoint (no auth required)
  apiRouter.get("/health", (_req, res) => {
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
  apiRouter.get("/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  apiRouter.get("/demo", handleDemo);

  // Authentication routes
  apiRouter.post("/auth/login", handleLogin);
  apiRouter.post("/auth/signup", handleSignup);

  // Queued list routes (protected)
  apiRouter.post("/queued/add", authMiddleware, addToQueue);
  apiRouter.get("/queued", authMiddleware, getQueuedLines);
  apiRouter.delete("/queued/:lineId", authMiddleware, clearQueuedLine);

  // History routes (protected)
  apiRouter.post("/history/add", authMiddleware, addToHistory);
  apiRouter.get("/history", authMiddleware, getHistory);
  apiRouter.get("/history/search", authMiddleware, searchHistory);

  // Chat routes (protected)
  apiRouter.get("/chat/group", authMiddleware, getOrCreateGroupChat);
  apiRouter.post("/chat/send", authMiddleware, sendMessage);
  apiRouter.get("/chat/messages", authMiddleware, getMessages);
  apiRouter.post("/chat/group/add-member", authMiddleware, addMemberToGroup);
  apiRouter.post("/chat/typing", authMiddleware, setTyping);
  apiRouter.get("/chat/typing", authMiddleware, getTypingStatus);
  apiRouter.post("/chat/mark-read", authMiddleware, markMessageAsRead);
  apiRouter.post("/chat/edit", authMiddleware, editMessage);
  apiRouter.post("/chat/delete", authMiddleware, deleteMessage);

  // Member routes (protected)
  apiRouter.get("/members", authMiddleware, getTeamMembers);
  apiRouter.post("/members", authMiddleware, createTeamMember);

  // Profile routes (protected)
  apiRouter.get("/profile", authMiddleware, getProfile);
  apiRouter.post("/profile/upload-picture", authMiddleware, uploadProfilePicture);
  apiRouter.post("/profile/update-name", authMiddleware, updateName);
  apiRouter.post("/profile/change-password", authMiddleware, changePassword);

  // Claim routes (protected)
  const claimRouter = express.Router();
  claimRouter.use(authMiddleware);
  claimRouter.get("/settings", getClaimSettings);
  claimRouter.put("/settings", updateClaimSettings);
  claimRouter.post("/", claimNumbers);
  claimRouter.get("/numbers", getClaimedNumbers);
  claimRouter.post("/release", releaseClaimedNumbers);
  apiRouter.use("/claim", claimRouter);

  // Announcements routes (protected)
  apiRouter.post("/announcements/send", authMiddleware, sendAnnouncement);
  apiRouter.get("/announcements", authMiddleware, getAnnouncements);

  // Mount the router under both /api and / to be flexible
  app.use("/api", apiRouter);
  app.use("/", apiRouter);

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
