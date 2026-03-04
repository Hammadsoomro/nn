import serverless from "serverless-http";
import express from "express";
import { createServer } from "./index";

let cachedHandler: any = null;

export const handler = async (event: any, context: any) => {
  // context.callbackWaitsForEmptyEventLoop = false; // Optional, might help with DB connections in some cases

  if (!cachedHandler) {
    const app = await createServer();
    // Wrap the app to handle Netlify requests
    cachedHandler = serverless(app);
  }

  return cachedHandler(event, context);
};
