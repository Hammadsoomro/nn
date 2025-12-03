import { RequestHandler } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth";
import { getCollections } from "../db";
import { getIO } from "../websocket-io";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import type { User } from "@shared/api";

// Hash password helper
const hashPassword = (password: string): string => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

// Create team member (admin only)
export const createTeamMember: RequestHandler = async (
  req: AuthRequest,
  res,
) => {
  try {
    if (!req.teamId) {
      res.status(401).json({ error: "Team not found" });
      return;
    }

    // Check if user is admin
    if (req.role !== "admin") {
      res.status(403).json({ error: "Only admins can create team members" });
      return;
    }

    const { email, password, name } = req.body;

    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2),
    });

    const validated = schema.parse({ email, password, name });

    const collections = getCollections();

    // Check if user already exists
    const existing = await collections.users.findOne({
      email: validated.email,
    });

    if (existing) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    // Create new team member
    const hashedPassword = hashPassword(validated.password);
    const result = await collections.users.insertOne({
      email: validated.email,
      name: validated.name,
      password: hashedPassword,
      role: "member",
      teamId: req.teamId,
      createdBy: req.userId,
      profilePicture: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const newUser: User = {
      _id: result.insertedId.toString(),
      email: validated.email,
      name: validated.name,
      role: "member",
      teamId: req.teamId,
      createdBy: req.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Auto-add to team group chat
    const groupChat = await collections.chatGroups.findOne({
      teamId: req.teamId,
      name: "Team Chat",
    });

    if (groupChat) {
      await collections.chatGroups.findOneAndUpdate(
        { _id: groupChat._id },
        {
          $addToSet: { members: newUser._id },
        },
      );
    }

    // Emit real-time update for member added
    const io = getIO();
    if (io) {
      io.emit("member-added", newUser);
    }

    res.status(201).json(newUser);
  } catch (error) {
    console.error("Error creating team member:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.errors });
      return;
    }
    res.status(400).json({ error: "Failed to create team member" });
  }
};

// Get all team members
export const getTeamMembers: RequestHandler = async (req: AuthRequest, res) => {
  try {
    if (!req.teamId) {
      res.status(401).json({ error: "Team not found" });
      return;
    }

    const collections = getCollections();
    const members = await collections.users
      .find({ teamId: req.teamId })
      .toArray();

    const formattedMembers = await Promise.all(
      members.map(async (member) => {
        const userId = member._id.toString();

        // Get total claims
        const totalClaims = await collections.history.countDocuments({
          teamId: req.teamId,
          claimedByUserId: userId,
        });

        // Get claims today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const claimsToday = await collections.history.countDocuments({
          teamId: req.teamId,
          claimedByUserId: userId,
          claimedAt: {
            $gte: startOfToday.toISOString(),
          },
        });

        return {
          _id: userId,
          email: member.email,
          name: member.name,
          role: member.role,
          profilePicture: member.profilePicture,
          createdBy: member.createdBy,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
          totalClaims,
          claimsToday,
        };
      }),
    );

    res.json(formattedMembers);
  } catch (error) {
    console.error("Error getting team members:", error);
    res.status(500).json({ error: "Failed to get team members" });
  }
};
