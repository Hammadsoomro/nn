import serverless from "serverless-http";
import { createServer } from "../../server";

let app: any;

export const handler = async (event: any, context: any) => {
  if (!app) {
    app = await createServer();
  }
  const handlerFunc = serverless(app);
  return handlerFunc(event, context);
};
