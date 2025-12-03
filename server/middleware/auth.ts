import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../routes/auth";
import { getCollections } from "../db";
import { ObjectId } from "mongodb";

export interface AuthRequest extends Request {
  userId: string;
  email: string;
  role: string;
  teamId?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.userId = decoded.id;
    req.email = decoded.email;
    req.role = decoded.role;

    // Extract teamId from user document
    try {
      const collections = getCollections();
      // Try to find by string ID first (from JWT)
      let user = await collections.users.findOne({
        _id: new ObjectId(decoded.id),
      });

      if (user) {
        req.teamId = user.teamId;
      }
    } catch (error) {
      // If the user lookup fails, continue anyway with basic auth
      console.error("Error fetching user data:", error);
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
};
