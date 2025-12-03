import { RequestHandler } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth";
import { getCollections } from "../db";
import { ObjectId } from "mongodb";
import crypto from "crypto";

// Hash password helper
const hashPassword = (password: string): string => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

// Upload profile picture
export const uploadProfilePicture: RequestHandler = async (
  req: AuthRequest,
  res,
) => {
  try {
    if (!req.userId) {
      console.error("Upload failed: No userId in request");
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { profilePictureUrl } = req.body;

    if (!profilePictureUrl) {
      console.error("Upload failed: No profilePictureUrl provided");
      res.status(400).json({ error: "Profile picture URL is required" });
      return;
    }

    const collections = getCollections();
    const result = await collections.users.findOneAndUpdate(
      { _id: new ObjectId(req.userId) },
      {
        $set: {
          profilePictureUrl,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" },
    );

    if (!result.value) {
      console.error("Upload failed: User not found for userId:", req.userId);
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updatedUser = {
      _id: result.value._id.toString(),
      email: result.value.email,
      name: result.value.name,
      role: result.value.role,
      profilePictureUrl: result.value.profilePictureUrl,
      teamId: result.value.teamId,
      createdAt: result.value.createdAt,
      updatedAt: result.value.updatedAt,
    };

    res.json(updatedUser);
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    res.status(500).json({ error: "Failed to upload profile picture" });
  }
};

// Get profile
export const getProfile: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const collections = getCollections();
    const user = await collections.users.findOne({
      _id: new ObjectId(req.userId),
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const userProfile = {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      profilePictureUrl: user.profilePictureUrl,
      teamId: user.teamId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json(userProfile);
  } catch (error) {
    console.error("Error getting profile:", error);
    res.status(500).json({ error: "Failed to get profile" });
  }
};

// Update user name
export const updateName: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;

    const schema = z.object({
      name: z.string().min(2),
    });

    const validated = schema.parse({ name });

    const collections = getCollections();
    const result = await collections.users.findOneAndUpdate(
      { _id: new ObjectId(req.userId) },
      {
        $set: {
          name: validated.name,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" },
    );

    if (!result.value) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updatedUser = {
      _id: result.value._id.toString(),
      email: result.value.email,
      name: result.value.name,
      role: result.value.role,
      profilePictureUrl: result.value.profilePictureUrl,
      teamId: result.value.teamId,
      createdAt: result.value.createdAt,
      updatedAt: result.value.updatedAt,
    };

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating name:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    res.status(500).json({ error: "Failed to update name" });
  }
};

// Change password
export const changePassword: RequestHandler = async (
  req: AuthRequest,
  res,
) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
    });

    const validated = schema.parse({ currentPassword, newPassword });

    const collections = getCollections();
    const user = await collections.users.findOne({
      _id: new ObjectId(req.userId),
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Verify current password
    const hashedCurrentPassword = hashPassword(validated.currentPassword);
    if (hashedCurrentPassword !== user.password) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    // Hash new password and update
    const hashedNewPassword = hashPassword(validated.newPassword);
    const result = await collections.users.findOneAndUpdate(
      { _id: new ObjectId(req.userId) },
      {
        $set: {
          password: hashedNewPassword,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" },
    );

    if (!result.value) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request" });
      return;
    }
    res.status(500).json({ error: "Failed to change password" });
  }
};
