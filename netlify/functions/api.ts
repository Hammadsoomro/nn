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
