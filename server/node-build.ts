import path from "path";
import { createServer } from "./index";
import { closeDB } from "./db";
import * as express from "express";
import http from "http";
import { Server } from "socket.io";
import { setIO } from "./websocket-io";

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

    // Socket.io connection handling
    io.on("connection", (socket) => {
      console.log(`[Socket.IO] User connected: ${socket.id}`);

      socket.on("join-chat", (data: { chatId: string; userId: string }) => {
        socket.join(data.chatId);
        console.log(
          `[Socket.IO] User ${data.userId} joined chat ${data.chatId}`,
        );
        socket.broadcast.to(data.chatId).emit("user-joined", {
          userId: data.userId,
          timestamp: new Date().toISOString(),
        });
      });

      socket.on(
        "send-message",
        (data: {
          messageId: string;
          sender: string;
          senderName: string;
          chatId: string;
          content: string;
          timestamp: string;
        }) => {
          console.log(
            `[Socket.IO] Message from ${data.sender} in ${data.chatId}`,
          );
          const messageToEmit = {
            ...data,
            chatId: data.chatId, // Ensure chatId is included
          };
          io.to(data.chatId).emit("new-message", messageToEmit);
        },
      );

      socket.on(
        "typing",
        (data: {
          chatId: string;
          userId: string;
          senderName: string;
          isTyping: boolean;
        }) => {
          socket.broadcast.to(data.chatId).emit("user-typing", {
            userId: data.userId,
            senderName: data.senderName,
            isTyping: data.isTyping,
          });
        },
      );

      socket.on(
        "message-read",
        (data: { messageId: string; userId: string }) => {
          io.emit("message-read", data);
        },
      );

      socket.on(
        "edit-message",
        (data: { messageId: string; content: string; chatId: string }) => {
          io.to(data.chatId).emit("message-edited", data);
        },
      );

      socket.on(
        "delete-message",
        (data: { messageId: string; chatId: string }) => {
          io.to(data.chatId).emit("message-deleted", data);
        },
      );

      socket.on("leave-chat", (data: { chatId: string }) => {
        socket.leave(data.chatId);
        console.log(`[Socket.IO] User left chat ${data.chatId}`);
      });

      socket.on("disconnect", () => {
        console.log(`[Socket.IO] User disconnected: ${socket.id}`);
      });
    });

    // In production, serve the built SPA files
    const __dirname = import.meta.dirname;
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
      console.log(`🚀 Fusion Starter server running on port ${port}`);
      console.log(`📱 Frontend: http://localhost:${port}`);
      console.log(`🔧 API: http://localhost:${port}/api`);
      console.log(`🔗 WebSocket: ws://localhost:${port}`);
      console.log(`✅ Socket.IO initialized`);
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("🛑 Received SIGTERM, shutting down gracefully");
      await closeDB();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      console.log("🛑 Received SIGINT, shutting down gracefully");
      await closeDB();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
