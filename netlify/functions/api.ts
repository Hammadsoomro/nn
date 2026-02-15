import serverless from "serverless-http";

import { createServer } from "../../server";

// Initialize the server once and reuse across invocations
const appPromise = createServer();
let cachedHandler: ReturnType<typeof serverless> | null = null;

export const handler = async (event: unknown, context: unknown) => {
  // Resolve the app promise (will be cached after first invocation)
  const app = await appPromise;

  // Create the serverless handler lazily (only once)
  if (!cachedHandler) {
    cachedHandler = serverless(app);
  }

  return cachedHandler(event, context);
};
