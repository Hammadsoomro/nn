import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../routes/auth";
import { getCollections } from "../db";
import { ObjectId } from "mongodb";
import { Socket } from "socket.io";

export interface AuthRequest extends Request {
  userId: string;
  email: string;
  role: string;
  teamId?: string;
}

export interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
    email?: string;
    role?: string;
    teamId?: string;
  };
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

// Socket.IO authentication handler
export const handleSocketAuth = async (socket: AuthenticatedSocket) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      console.log(
        `[Socket.IO] Connection rejected: No token provided (${socket.id})`,
      );
      socket.disconnect();
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.log(
        `[Socket.IO] Connection rejected: Invalid or expired token (${socket.id})`,
      );
      socket.disconnect();
      return;
    }

    // Store authentication data on socket
    socket.data.userId = decoded.id;
    socket.data.email = decoded.email;
    socket.data.role = decoded.role;

    // Extract teamId from user document
    try {
      const collections = getCollections();
      const user = await collections.users.findOne({
        _id: new ObjectId(decoded.id),
      });

      if (user) {
        socket.data.teamId = user.teamId;
      }
    } catch (error) {
      console.error("[Socket.IO] Error fetching user data:", error);
    }

    console.log(
      `[Socket.IO] User authenticated: ${socket.data.userId} (${socket.id})`,
    );
  } catch (error) {
    console.error("[Socket.IO] Authentication error:", error);
    socket.disconnect();
  }
};
