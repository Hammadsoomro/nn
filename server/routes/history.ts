import { RequestHandler } from "express";
import { z } from "zod";
import type { HistoryEntry } from "@shared/api";
import { getCollections } from "../db";

export const addToHistory: RequestHandler = async (req, res) => {
  try {
    const schema = z.object({
      content: z.string(),
      claimedBy: z.string(),
    });

    const validated = schema.parse(req.body);
    const teamId = (req as any).teamId || "default-team";

    const collections = getCollections();

    const result = await collections.history.insertOne({
      content: validated.content,
      claimedBy: validated.claimedBy,
      claimedAt: new Date().toISOString(),
      teamId,
    });

    const entry: HistoryEntry = {
      _id: result.insertedId.toString(),
      content: validated.content,
      claimedBy: validated.claimedBy,
      claimedAt: new Date().toISOString(),
      teamId,
    };

    res.json({ success: true, entry });
  } catch (error) {
    console.error("Add to history error:", error);
    res.status(400).json({ error: "Invalid request" });
  }
};

export const getHistory: RequestHandler = async (req, res) => {
  try {
    const teamId = (req as any).teamId || "default-team";
    const userId = (req as any).userId || "";
    const isAdmin = (req as any).role === "admin";
    const { search, date } = req.query;

    const collections = getCollections();

    const filter: any = { teamId };

    // Filter by user if not admin
    if (!isAdmin && userId) {
      filter.claimedByUserId = userId;
    }

    // Build query with search
    if (search && typeof search === "string") {
      filter.content = { $regex: search, $options: "i" };
    }

    // Apply date filter
    if (date && typeof date === "string") {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      filter.claimedAt = {
        $gte: startDate.toISOString(),
        $lte: endDate.toISOString(),
      };
    }

    const entries = await collections.history
      .find(filter)
      .sort({ claimedAt: -1 })
      .toArray();

    const formattedEntries: HistoryEntry[] = entries.map((entry) => ({
      _id: entry._id.toString(),
      content: entry.content,
      claimedBy: entry.claimedBy,
      claimedAt: entry.claimedAt,
      teamId: entry.teamId,
    }));

    res.json({ entries: formattedEntries });
  } catch (error) {
    console.error("Get history error:", error);
    res.status(400).json({ error: "Failed to fetch history" });
  }
};

export const searchHistory: RequestHandler = async (req, res) => {
  try {
    const teamId = (req as any).teamId || "default-team";
    const { query } = req.query;

    if (!query || typeof query !== "string") {
      res.status(400).json({ error: "Query required" });
      return;
    }

    const collections = getCollections();

    const entries = await collections.history
      .find({
        teamId,
        content: { $regex: query, $options: "i" },
      })
      .sort({ claimedAt: -1 })
      .toArray();

    const formattedEntries: HistoryEntry[] = entries.map((entry) => ({
      _id: entry._id.toString(),
      content: entry.content,
      claimedBy: entry.claimedBy,
      claimedAt: entry.claimedAt,
      teamId: entry.teamId,
    }));

    res.json({ entries: formattedEntries });
  } catch (error) {
    console.error("Search history error:", error);
    res.status(400).json({ error: "Search failed" });
  }
};
