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

    const addedLines: QueuedLine[] = linesToInsert.map((line, idx) => ({
      _id: result.insertedIds[idx].toString(),
      ...line,
    }));

    // Emit real-time update for queued lines
    const io = getIO();
    if (io) {
      const allLines = await collections.queuedLines.find({ teamId }).toArray();
      io.emit("lines-queued-updated", {
        count: allLines.length,
        teamId,
      });
    }

    res.json({ success: true, lines: addedLines });
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
  try {
    const { lineId } = req.params;
    const teamId = (req as any).teamId;

    if (!teamId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const collections = getCollections();

    const result = await collections.queuedLines.deleteOne({
      _id: new ObjectId(lineId),
      teamId,
    });

    if (result.deletedCount === 0) {
      res.status(404).json({ error: "Line not found or unauthorized" });
      return;
    }

    // Emit real-time update for queued lines
    const io = getIO();
    if (io) {
      const allLines = await collections.queuedLines.find({ teamId }).toArray();
      io.emit("lines-queued-updated", {
        count: allLines.length,
        teamId,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Clear queued line error:", error);
    res.status(400).json({ error: "Failed to clear line" });
  }
};
