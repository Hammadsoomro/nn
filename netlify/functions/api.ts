import serverless from "serverless-http";

import { createServer } from "../../server";

// Initialize the server once and reuse across invocations
const appPromise = createServer();
let handler: any = null;

export const handler = async (event: any, context: any) => {
  // Resolve the app promise (will be cached after first invocation)
  const app = await appPromise;

  // Create the serverless handler lazily (only once)
  if (!handler) {
    handler = serverless(app);
  }

  return handler(event, context);
};
