import { RequestHandler } from "express";
import { z } from "zod";
import type {
  LoginRequest,
  SignupRequest,
  AuthResponse,
  User,
} from "@shared/api";
import crypto from "crypto";
import { getCollections } from "../db";
import { ObjectId } from "mongodb";

// Helper: Hash password (demo - use bcrypt in production)
const hashPassword = (password: string): string => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

// Helper: Create simple token (base64 encoded JSON with hash)
const createToken = (user: User): string => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const jwtSecret = process.env.JWT_SECRET || "demo-secret";
  const signature = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload) + jwtSecret)
    .digest("hex");
  return `${Buffer.from(JSON.stringify(payload)).toString("base64")}.${signature}`;
};

// Signup - Creates admin account
export const handleSignup: RequestHandler = async (req, res) => {
  try {
    const body = req.body as SignupRequest;

    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2),
    });

    const validated = schema.parse(body);

    try {
      const collections = getCollections();

      // Check if user exists
      const existing = await collections.users.findOne({
        email: validated.email,
      });

      if (existing) {
        res.status(400).json({ error: "User already exists" });
        return;
      }

      // Create admin user with new team
      const teamId = new ObjectId().toHexString();
      const hashedPassword = hashPassword(validated.password);

      const result = await collections.users.insertOne({
        email: validated.email,
        name: validated.name,
        role: "admin",
        teamId,
        password: hashedPassword,
        profilePicture: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const newUser: User = {
        _id: result.insertedId.toString(),
        email: validated.email,
        name: validated.name,
        role: "admin",
        teamId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const token = createToken(newUser);
      const response: AuthResponse = { token, user: newUser };

      res.status(201).json(response);
    } catch (dbError) {
      console.error("Database error in signup:", dbError);
      res.status(500).json({ error: "Database is not configured" });
    }
  } catch (error) {
    console.error("Signup error:", error);
    res.status(400).json({ error: "Invalid request" });
  }
};

// Login
export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const body = req.body as LoginRequest;

    const schema = z.object({
      email: z.string().email(),
      password: z.string(),
    });

    const validated = schema.parse(body);
    const hashedPassword = hashPassword(validated.password);

    try {
      const collections = getCollections();

      // Find user
      const userRecord = await collections.users.findOne({
        email: validated.email,
        password: hashedPassword,
      });

      if (!userRecord) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const user: User = {
        _id: userRecord._id.toString(),
        email: userRecord.email,
        name: userRecord.name,
        role: userRecord.role,
        teamId: userRecord.teamId,
        createdAt: userRecord.createdAt,
        updatedAt: userRecord.updatedAt,
      };

      const token = createToken(user);
      const response: AuthResponse = { token, user };

      res.json(response);
    } catch (dbError) {
      console.error("Database error in login:", dbError);
      res.status(500).json({ error: "Database is not configured" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(400).json({ error: "Invalid request" });
  }
};

// Verify token middleware
export const verifyToken = (
  token: string,
): { id: string; email: string; role: string } | null => {
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return null;

    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64").toString(),
    );

    // Check expiration
    if (payload.exp < Date.now()) return null;

    // Verify signature
    const jwtSecret = process.env.JWT_SECRET || "demo-secret";
    const expectedSignature = crypto
      .createHash("sha256")
      .update(JSON.stringify(payload) + jwtSecret)
      .digest("hex");

    if (signature !== expectedSignature) return null;

    return { id: payload.id, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
};
