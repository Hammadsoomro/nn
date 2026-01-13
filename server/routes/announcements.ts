import { Router, Request, Response } from "express";
import { getCollections } from "../db";
import { getIO } from "../websocket-io";
import { ObjectId } from "mongodb";

export async function sendAnnouncement(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    const teamId = (req as any).teamId;
    const role = (req as any).role;
    const { text } = req.body;

    // Check if user is admin
    if (role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can send announcements" });
    }

    // Validate input
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text field is required" });
    }

    if (text.trim().length === 0) {
      return res.status(400).json({ error: "Announcement cannot be empty" });
    }

    if (text.length > 500) {
      return res
        .status(400)
        .json({ error: "Announcement must be 500 characters or less" });
    }

    const collections = getCollections();
    const announcement = {
      _id: new ObjectId(),
      teamId,
      text: text.trim(),
      sentBy: userId,
      createdAt: new Date(),
    };

    // Save to database
    await collections.announcements.insertOne(announcement);

    // Emit to all connected users in the team via WebSocket
    const io = getIO();
    if (io) {
      io.emit("announcement-received", {
        _id: announcement._id.toString(),
        text: announcement.text,
        sentBy: userId,
        teamId: teamId,
        createdAt: announcement.createdAt.toISOString(),
      });
    }

    res.json({ success: true, announcement: announcement._id.toString() });
  } catch (error) {
    console.error("[announcements] Error sending announcement:", error);
    res.status(500).json({ error: "Failed to send announcement" });
  }
}

export async function getAnnouncements(req: Request, res: Response) {
  try {
    const teamId = (req as any).teamId;

    const collections = getCollections();
    const announcements = await collections.announcements
      .find({ teamId })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    res.json({ announcements });
  } catch (error) {
    console.error("[announcements] Error fetching announcements:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
}
