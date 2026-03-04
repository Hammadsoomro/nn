import serverless from "serverless-http";
import express from "express";
import { createServer } from "./index";

let cachedHandler: any = null;

export const handler = async (event: any, context: any) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!cachedHandler) {
    try {
      const app = await createServer();
      // Wrap the app to handle Netlify requests
      cachedHandler = serverless(app, {
        binary: ["image/*", "font/*", "application/octet-stream"],
      });
    } catch (error) {
      console.error("[Server] Critical initialization error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Critical server initialization error",
          message: String(error)
        })
      };
    }
  }

  try {
    return await cachedHandler(event, context);
  } catch (error) {
    console.error("[Server] Request processing error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error during request processing",
        message: String(error)
      })
    };
  }
};
