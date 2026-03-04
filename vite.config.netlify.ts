import { defineConfig } from "vite";
import path from "path";

// Netlify Serverless Function build configuration
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "server/netlify-function.ts"),
      name: "api",
      fileName: "api",
      formats: ["es"],
    },
    outDir: "netlify/functions",
    target: "node22",
    ssr: true,
    rollupOptions: {
      external: [
        // Node.js built-ins
        "fs",
        "path",
        "url",
        "http",
        "https",
        "os",
        "crypto",
        "stream",
        "util",
        "events",
        "buffer",
        "querystring",
        "child_process",
        // External dependencies that should not be bundled
        "express",
        "cors",
        "mongodb",
        "serverless-http",
        "zod",
      ],
      output: {
        format: "es",
        entryFileNames: "[name].mjs",
      },
    },
    minify: false,
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
