import { RequestHandler } from "express";
import { z } from "zod";
import type {
  LoginRequest,
  SignupRequest,
  AuthResponse,
  User,
} from "@shared/api";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { getCollections } from "../db";
import { ObjectId } from "mongodb";

// Helper: Get JWT secret from environment
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is not set. Cannot create or verify authentication tokens.",
    );
  }
  return secret;
};

// Helper: Hash password with bcrypt
const hashPassword = async (password: string): Promise<string> => {
  return bcryptjs.hash(password, 10);
};

// Helper: Compare password with bcrypt
const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcryptjs.compare(password, hash);
};

// Helper: Create JWT token
const createToken = (user: User): string => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
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
    const jwtSecret = getJwtSecret();
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
