import { RequestHandler } from "express";
import { z } from "zod";
import { getCollections } from "../db";
import { getIO } from "../websocket-io";
import { ObjectId } from "mongodb";

// Get or create claim settings for team
export const getClaimSettings: RequestHandler = async (req, res) => {
  try {
    const teamId = (req as any).teamId;

    if (!teamId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const collections = getCollections();

    let settings = await collections.claimSettings.findOne({ teamId });

    if (!settings) {
      // Create default settings
      const result = await collections.claimSettings.insertOne({
        teamId,
        lineCount: 5,
        cooldownMinutes: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      settings = {
        _id: result.insertedId,
        teamId,
        lineCount: 5,
        cooldownMinutes: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    res.json({
      _id: settings._id.toString(),
      teamId: settings.teamId,
      lineCount: settings.lineCount,
      cooldownMinutes: settings.cooldownMinutes,
    });
  } catch (error) {
    console.error("Get claim settings error:", error);
    res.status(500).json({ error: "Failed to get claim settings" });
  }
};

// Update claim settings (admin only)
export const updateClaimSettings: RequestHandler = async (req, res) => {
  try {
    const teamId = (req as any).teamId;
    const role = (req as any).role;

    if (!teamId || role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }

    const schema = z.object({
      lineCount: z.number().min(1).max(100),
      cooldownMinutes: z.number().min(0.5).max(1440),
    });

    const validated = schema.parse(req.body);
    const collections = getCollections();

    const result = await collections.claimSettings.findOneAndUpdate(
      { teamId },
      {
        $set: {
          lineCount: validated.lineCount,
          cooldownMinutes: validated.cooldownMinutes,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after", upsert: true },
    );

    // Emit real-time update for claim settings
    const io = getIO();
    if (io) {
      io.emit("claim-settings-updated", {
        teamId,
        lineCount: result.value?.lineCount,
        cooldownMinutes: result.value?.cooldownMinutes,
      });
    }

    res.json({
      _id: result.value?._id.toString(),
      teamId: result.value?.teamId,
      lineCount: result.value?.lineCount,
      cooldownMinutes: result.value?.cooldownMinutes,
    });
  } catch (error) {
    console.error("Update claim settings error:", error);
    res.status(400).json({ error: "Invalid request" });
  }
};

// Claim numbers
export const claimNumbers: RequestHandler = async (req, res) => {
  try {
    const teamId = (req as any).teamId;
    const userId = (req as any).userId;

    if (!teamId || !userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const collections = getCollections();

    // Get user name
    const user = await collections.users.findOne({
      _id: new ObjectId(userId),
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Get claim settings
    const settings = await collections.claimSettings.findOne({ teamId });
    const lineCount = settings?.lineCount || 5;
    const cooldownMinutes = settings?.cooldownMinutes || 30;

    // Get available queued lines
    const availableLines = await collections.queuedLines
      .find({ teamId })
      .limit(lineCount)
      .toArray();

    if (availableLines.length === 0) {
      res.status(400).json({ error: "No lines available to claim" });
      return;
    }

    const claimedLineIds = availableLines.map((line) => line._id);
    const claimedAt = new Date().toISOString();
    const cooldownUntil = new Date(
      Date.now() + cooldownMinutes * 60 * 1000,
    ).toISOString();

    // Insert into claimedNumbers
    const claimedRecords = availableLines.map((line) => ({
      content: line.content,
      claimedBy: userId,
      claimedByName: user.name,
      claimedAt,
      cooldownUntil,
      teamId,
    }));

    const claimResult =
      await collections.claimedNumbers.insertMany(claimedRecords);

    // Add to history
    const historyRecords = availableLines.map((line) => ({
      content: line.content,
      claimedBy: user.name,
      claimedByUserId: userId,
      claimedAt,
      teamId,
    }));

    await collections.history.insertMany(historyRecords);

    // Remove from queued lines
    await collections.queuedLines.deleteMany({
      _id: { $in: claimedLineIds },
    });

    // Emit real-time update for claimed today count
    const io = getIO();
    if (io) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = today.toISOString();

      const claimedToday = await collections.claimedNumbers
        .find({
          teamId,
          claimedBy: userId,
          claimedAt: { $gte: todayString },
        })
        .toArray();

      io.emit("claimed-today-updated", {
        count: claimedToday.length,
        teamId,
        userId,
      });

      // Also emit update for queued lines count (since lines were removed)
      const queuedLines = await collections.queuedLines
        .find({ teamId })
        .toArray();
      io.emit("lines-queued-updated", {
        count: queuedLines.length,
        teamId,
      });
    }

    const response = {
      success: true,
      claimedCount: availableLines.length,
      claimedLines: availableLines.map((line, idx) => ({
        _id: claimResult.insertedIds[idx].toString(),
        content: line.content,
        claimedAt,
        cooldownUntil,
      })),
    };

    res.json(response);
  } catch (error) {
    console.error("Claim numbers error:", error);
    res.status(500).json({ error: "Failed to claim numbers" });
  }
};

// Get user's claimed numbers
export const getClaimedNumbers: RequestHandler = async (req, res) => {
  try {
    const teamId = (req as any).teamId;
    const userId = (req as any).userId;

    if (!teamId || !userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const collections = getCollections();

    const claimedNumbers = await collections.claimedNumbers
      .find({
        teamId,
        claimedBy: userId,
      })
      .sort({ claimedAt: -1 })
      .toArray();

    const formatted = claimedNumbers.map((claim) => ({
      _id: claim._id.toString(),
      content: claim.content,
      claimedAt: claim.claimedAt,
      cooldownUntil: claim.cooldownUntil,
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Get claimed numbers error:", error);
    res.status(500).json({ error: "Failed to get claimed numbers" });
  }
};

// Release claimed numbers (allow reclaim)
export const releaseClaimedNumbers: RequestHandler = async (req, res) => {
  try {
    const teamId = (req as any).teamId;
    const userId = (req as any).userId;

    if (!teamId || !userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const collections = getCollections();

    // Delete current claimed numbers
    await collections.claimedNumbers.deleteMany({
      teamId,
      claimedBy: userId,
    });

    // Emit real-time update for claimed today count
    const io = getIO();
    if (io) {
      io.emit("claimed-today-updated", {
        count: 0,
        teamId,
        userId,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Release claimed numbers error:", error);
    res.status(500).json({ error: "Failed to release claimed numbers" });
  }
};
