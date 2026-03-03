import serverless from "serverless-http";
import { createServer } from "../../server";

let cachedHandler: any;

export const handler = async (event: any, context: any) => {
  context.callbackWaitsForEmptyEventLoop = false;

  // Ensure the database is connected
  if (!cachedHandler) {
    try {
      const app = await createServer();
      cachedHandler = serverless(app, {
        binary: ["image/*", "font/*", "application/octet-stream"],
      });
    } catch (error) {
      console.error("Failed to initialize serverless handler:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal Server Error", message: String(error) }),
      };
    }
  }

  return cachedHandler(event, context);
};
