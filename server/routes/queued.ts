import { RequestHandler } from "express";
import { z } from "zod";
import type { QueuedLine } from "@shared/api";
import { getCollections } from "../db";
import { getIO } from "../websocket-io";
import { ObjectId } from "mongodb";

export const addToQueue: RequestHandler = async (req, res) => {
  try {
    const schema = z.object({
      lines: z.array(z.string()).min(1),
    });

    const validated = schema.parse(req.body);
    const teamId = (req as any).teamId;
    const userId = (req as any).userId;

    if (!teamId || !userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const collections = getCollections();

    const linesToInsert = validated.lines.map((content) => ({
      content,
      addedBy: userId,
      addedAt: new Date().toISOString(),
      teamId,
    }));

    const result = await collections.queuedLines.insertMany(linesToInsert);

    // Emit real-time update for queued lines
    const io = getIO();
    if (io) {
      const count = await collections.queuedLines.countDocuments({ teamId });
      io.emit("lines-queued-updated", {
        count,
        teamId,
      });
    }

    res.json({ success: true, count: result.insertedCount });
  } catch (error) {
    console.error("Add to queue error:", error);
    res.status(400).json({ error: "Invalid request" });
  }
};

export const getQueuedLines: RequestHandler = async (req, res) => {
  try {
    const teamId = (req as any).teamId;

    if (!teamId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const collections = getCollections();

    const lines = await collections.queuedLines
      .find({ teamId })
      .sort({ addedAt: -1 })
      .toArray();

    const formattedLines: QueuedLine[] = lines.map((line) => ({
      _id: line._id.toString(),
      content: line.content,
      addedBy: line.addedBy,
      addedAt: line.addedAt,
      teamId: line.teamId,
    }));

    res.json({ lines: formattedLines });
  } catch (error) {
    console.error("Get queued lines error:", error);
    res.status(400).json({ error: "Failed to fetch queued lines" });
  }
};

export const clearQueuedLine: RequestHandler = async (req, res) => {
  // ... existing code ...
};

export const deduplicateLines: RequestHandler = async (req, res) => {
  try {
    const schema = z.object({
      lines: z.array(z.string()),
    });

    const validated = schema.parse(req.body);
    const teamId = (req as any).teamId;

    if (!teamId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const collections = getCollections();

    // 1. Get ALL queued lines for exact match
    // Optimization: Instead of fetching all, we could use $in check if the input is small,
    // but the user wants "super fast" and if input is large, $in is also slow.
    // However, fetching all into memory is worse.
    // Let's use aggregation or $in for checking existence.

    const inputLines = validated.lines.map(l => l.trim().toLowerCase()).filter(l => l);
    if (inputLines.length === 0) {
      res.json({ unique: [] });
      return;
    }

    // Use a more efficient way to check existence
    // We'll check in chunks if necessary, but for now $in should be fine for a few thousand
    const existingQueued = await collections.queuedLines
      .find({ teamId, content: { $in: inputLines } })
      .project({ content: 1 })
      .toArray();

    const existingHistory = await collections.history
      .find({ teamId, content: { $in: inputLines } })
      .project({ content: 1 })
      .toArray();

    const queuedSet = new Set(existingQueued.map(l => l.content.toLowerCase()));
    const historySet = new Set(existingHistory.map(l => l.content.toLowerCase()));

    const getFirstWords = (text: string) => text.split(/\s+/).slice(0, 15).join(" ");

    const seen = new Set<string>();
    const unique: string[] = [];

    validated.lines.forEach((line) => {
      const trimmedLine = line.trim().toLowerCase();
      if (!trimmedLine) return;

      const key = getFirstWords(trimmedLine);

      if (
        !seen.has(key) &&
        !queuedSet.has(trimmedLine) &&
        !historySet.has(trimmedLine)
      ) {
        seen.add(key);
        unique.push(line);
      }
    });

    res.json({ unique });
  } catch (error) {
    console.error("Deduplicate lines error:", error);
    res.status(400).json({ error: "Failed to deduplicate lines" });
  }
};
