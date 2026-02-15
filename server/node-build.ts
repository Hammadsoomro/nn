import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "./index";
import { closeDB } from "./db";
import * as express from "express";
import http from "http";
import { Server } from "socket.io";
import { setIO } from "./websocket-io";
import { handleSocketAuth } from "./middleware/auth";
import { createLogger } from "./logger";

const logger = createLogger("ProductionServer");

async function startServer() {
  try {
    const app = await createServer();
    const httpServer = http.createServer(app);
    const port = process.env.PORT || 3000;

    // Setup Socket.io for production
    const io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    setIO(io);

    // Socket.io connection handling with authentication
    io.on("connection", async (socket) => {
      // Authenticate socket connection
      await handleSocketAuth(socket as any);

      // If socket was disconnected during auth, exit early
      if (!socket.connected) return;

      logger.info(`User connected: ${socket.id}`);

      socket.on("disconnect", () => {
        logger.info(`User disconnected: ${socket.id}`);
      });
    });

    // In production, serve the built SPA files
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const distPath = path.join(__dirname, "../spa");

    // Serve static files (but not index.html for API routes)
    app.use((req, res, next) => {
      // Skip static file serving for API routes
      if (req.path.startsWith("/api/")) {
        return next();
      }
      express.static(distPath)(req, res, next);
    });

    // Handle React Router - serve index.html for all non-API routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

    httpServer.listen(port, () => {
      logger.info(`🚀 Server running on port ${port}`);
      logger.info(`📱 Frontend: http://localhost:${port}`);
      logger.info(`🔧 API: http://localhost:${port}/api`);
      logger.info(`🔗 WebSocket: ws://localhost:${port}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      logger.warn("🛑 Received SIGTERM, shutting down gracefully");
      await closeDB();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      logger.warn("🛑 Received SIGINT, shutting down gracefully");
      await closeDB();
      process.exit(0);
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
}

startServer();
