import { defineConfig, Plugin, ViteDevServer } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";
import { Server } from "socket.io";
import { setIO } from "./server/websocket-io";
import { handleSocketAuth } from "./server/middleware/auth";

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
    // Performance optimization
    target: "esnext",
    minify: "esbuild",
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split vendor libraries into separate chunks
          if (id.includes("node_modules")) {
            if (id.includes("react") && id.includes("router")) {
              return "vendor-react-router";
            }
            if (id.includes("react")) {
              return "vendor-react";
            }
            if (id.includes("@tanstack")) {
              return "vendor-query";
            }
            if (id.includes("socket.io-client")) {
              return "vendor-socket";
            }
            if (id.includes("@radix-ui")) {
              return "vendor-ui";
            }
            return "vendor";
          }
        },
        // Optimize chunk naming for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split("/").pop()
            : "chunk";
          return `chunks/[name]-[hash].js`;
        },
        entryFileNames: "[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split(".");
          const ext = info[info.length - 1];
          if (["gif", "png", "jpg", "jpeg"].includes(ext)) {
            return `images/[name]-[hash][extname]`;
          } else if (ext === "css") {
            return `css/[name]-[hash][extname]`;
          } else if (["woff", "woff2"].includes(ext)) {
            return `fonts/[name]-[hash][extname]`;
          }
          return `[name]-[hash][extname]`;
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 600,
    // Enable source maps for production debugging (set to false to reduce bundle size)
    sourcemap: false,
    // CSS handling
    cssCodeSplit: true,
    // Compression
    brotliSize: true,
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

        // Socket.io connection handling with authentication
        io.on("connection", async (socket) => {
          // Authenticate socket connection
          await handleSocketAuth(socket as any);

          // If socket was disconnected during auth, exit early
          if (!socket.connected) return;

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
