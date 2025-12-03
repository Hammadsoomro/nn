import { defineConfig, Plugin, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";
import { Server } from "socket.io";
import { setIO } from "./server/websocket-io";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  appType: "spa",
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    async configureServer(server: ViteDevServer) {
      const app = await createServer();

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);

      // Setup Socket.io on Vite's httpServer
      if (server.httpServer) {
        const io = new Server(server.httpServer, {
          cors: {
            origin: "*",
            methods: ["GET", "POST"],
          },
        });

        setIO(io);

        // Socket.io connection handling
        io.on("connection", (socket) => {
          console.log(`[Socket.IO] User connected: ${socket.id}`);

          // User joins a chat room
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

          // User sends a message
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

          // User is typing
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

          // User marks message as read
          socket.on(
            "message-read",
            (data: { messageId: string; userId: string; chatId?: string }) => {
              // Broadcast to all users (they'll filter by messageId)
              io.emit("message-read", data);
              console.log(
                `[Socket.IO] Message marked as read: ${data.messageId}`,
              );
            },
          );

          // User edits a message
          socket.on(
            "edit-message",
            (data: { messageId: string; content: string; chatId: string }) => {
              io.to(data.chatId).emit("message-edited", data);
            },
          );

          // User deletes a message
          socket.on(
            "delete-message",
            (data: { messageId: string; chatId: string }) => {
              io.to(data.chatId).emit("message-deleted", data);
            },
          );

          // User leaves a chat
          socket.on("leave-chat", (data: { chatId: string }) => {
            socket.leave(data.chatId);
            console.log(`[Socket.IO] User left chat ${data.chatId}`);
          });

          // Handle disconnect
          socket.on("disconnect", () => {
            console.log(`[Socket.IO] User disconnected: ${socket.id}`);
          });
        });

        console.log("[Socket.IO] Initialized on Vite dev server");
      }
    },
  };
}
