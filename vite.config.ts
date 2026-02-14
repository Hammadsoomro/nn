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

          // Handle disconnect
          socket.on("disconnect", () => {
          });
        });
      }
    },
  };
}
