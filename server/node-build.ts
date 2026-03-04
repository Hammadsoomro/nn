import path from "path";
import { createServer } from "./index";
import { closeDB } from "./db";
import * as express from "express";
import http from "http";

async function startServer() {
  try {
    const app = await createServer();
    const httpServer = http.createServer(app);
    const port = process.env.PORT || 3000;

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
    app.get("(.*)", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });

    httpServer.listen(port, () => {
      console.log(`🚀 Fusion Starter server running on port ${port}`);
      console.log(`📱 Frontend: http://localhost:${port}`);
      console.log(`🔧 API: http://localhost:${port}/api`);
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
