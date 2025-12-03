import { RequestHandler } from "express";
import { AuthRequest } from "../middleware/auth";
import { getCollections } from "../db";
import { ObjectId } from "mongodb";
import {
  setTypingIndicator,
  getTypingIndicators,
  clearTypingIndicator,
} from "../websocket";
import type { ChatMessage, ChatGroup } from "@shared/api";

// Get or create team group chat
export const getOrCreateGroupChat: RequestHandler = async (
  req: AuthRequest,
  res,
) => {
  try {
    if (!req.teamId) {
      res.status(401).json({ error: "Team not found" });
      return;
    }

    const collections = getCollections();
    let group = await collections.chatGroups.findOne({
      teamId: req.teamId,
      name: "Team Chat",
    });

    if (!group) {
      const result = await collections.chatGroups.insertOne({
        name: "Team Chat",
        teamId: req.teamId,
        members: [req.userId],
        createdAt: new Date().toISOString(),
      });

      group = {
        _id: result.insertedId,
        name: "Team Chat",
        teamId: req.teamId,
        members: [req.userId],
        createdAt: new Date().toISOString(),
      } as any;
    }

    res.json({
      _id: String(group._id),
      name: group.name,
      teamId: group.teamId,
      members: group.members,
      createdAt: group.createdAt,
    });
  } catch (error) {
    console.error("Error getting group chat:", error);
    res.status(500).json({ error: "Failed to get group chat" });
  }
};

// Send message (1-on-1 or group)
export const sendMessage: RequestHandler = async (req: AuthRequest, res) => {
  try {
    if (!req.teamId) {
      res.status(401).json({ error: "Team not found" });
      return;
    }

    const { content, recipient, groupId } = req.body;

    if (!content) {
      res.status(400).json({ error: "Message content is required" });
      return;
    }

    if (!recipient && !groupId) {
      res
        .status(400)
        .json({ error: "Either recipient or groupId is required" });
      return;
    }

    const collections = getCollections();

    // Get sender info
    const sender = await collections.users.findOne({
      _id: new ObjectId(req.userId),
    });

    const message: any = {
      sender: req.userId,
      senderName: sender?.name || "Unknown",
      senderPicture: sender?.profilePicture,
      content,
      createdAt: new Date().toISOString(),
      teamId: req.teamId,
    };

    if (recipient) {
      message.recipient = recipient;
    }

    if (groupId) {
      message.groupId = groupId;
    }

    const result = await collections.chatMessages.insertOne(message);

    res.json({
      _id: result.insertedId.toString(),
      ...message,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

// Get messages for a chat (1-on-1 or group)
export const getMessages: RequestHandler = async (req: AuthRequest, res) => {
  try {
    if (!req.teamId) {
      res.status(401).json({ error: "Team not found" });
      return;
    }

    const { recipient, groupId } = req.query;

    if (!recipient && !groupId) {
      res
        .status(400)
        .json({ error: "Either recipient or groupId is required" });
      return;
    }

    const collections = getCollections();
    let query: any = { teamId: req.teamId };

    if (recipient) {
      query.$or = [
        { sender: req.userId, recipient: recipient as string },
        { sender: recipient as string, recipient: req.userId },
      ];
    } else if (groupId) {
      query.groupId = groupId;
    }

    const messages = await collections.chatMessages
      .find(query)
      .sort({ createdAt: 1 })
      .limit(100)
      .toArray();

    const formattedMessages = messages.map((msg) => ({
      _id: msg._id.toString(),
      sender: msg.sender,
      senderName: msg.senderName,
      senderPicture: msg.senderPicture,
      recipient: msg.recipient,
      groupId: msg.groupId,
      content: msg.content,
      createdAt: msg.createdAt,
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error("Error getting messages:", error);
    res.status(500).json({ error: "Failed to get messages" });
  }
};

// Add member to group chat
export const addMemberToGroup: RequestHandler = async (
  req: AuthRequest,
  res,
) => {
  try {
    if (!req.teamId) {
      res.status(401).json({ error: "Team not found" });
      return;
    }

    const { groupId, memberId } = req.body;

    const collections = getCollections();
    const result = await collections.chatGroups.findOneAndUpdate(
      { _id: new ObjectId(groupId), teamId: req.teamId },
      {
        $addToSet: { members: memberId },
      },
      { returnDocument: "after" },
    );

    if (!result.value) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const group = result.value;
    res.json({
      _id: group._id.toString(),
      name: group.name,
      teamId: group.teamId,
      members: group.members,
      createdAt: group.createdAt,
    });
  } catch (error) {
    console.error("Error adding member to group:", error);
    res.status(500).json({ error: "Failed to add member to group" });
  }
};

// Set typing indicator
export const setTyping: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const { chatId, chatType, isTyping } = req.body;

    if (!chatId || !chatType) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const collections = getCollections();
    const sender = await collections.users.findOne({
      _id: new ObjectId(req.userId),
    });

    if (isTyping) {
      setTypingIndicator({
        userId: req.userId,
        senderName: sender?.name || "Unknown",
        chatId,
        chatType: chatType as "group" | "direct",
        timestamp: Date.now(),
      });
    } else {
      clearTypingIndicator(req.userId, chatId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error setting typing indicator:", error);
    res.status(500).json({ error: "Failed to set typing indicator" });
  }
};

// Get typing indicators for a chat
export const getTypingStatus: RequestHandler = async (
  req: AuthRequest,
  res,
) => {
  try {
    const { chatId } = req.query;

    if (!chatId) {
      res.status(400).json({ error: "Missing chatId" });
      return;
    }

    const indicators = getTypingIndicators(chatId as string);
    res.json(indicators);
  } catch (error) {
    console.error("Error getting typing status:", error);
    res.status(500).json({ error: "Failed to get typing status" });
  }
};

// Mark message as read
export const markMessageAsRead: RequestHandler = async (
  req: AuthRequest,
  res,
) => {
  try {
    const { messageId } = req.body;

    if (!messageId) {
      res.status(400).json({ error: "Missing messageId" });
      return;
    }

    try {
      const collections = getCollections();
      const result = await collections.chatMessages.findOneAndUpdate(
        { _id: new ObjectId(messageId) },
        {
          $addToSet: { readBy: req.userId },
        },
        { returnDocument: "after" },
      );

      if (!result.value) {
        res.status(404).json({ error: "Message not found" });
        return;
      }

      const message = result.value;
      res.json({
        _id: message._id.toString(),
        sender: message.sender,
        senderName: message.senderName,
        senderPicture: message.senderPicture,
        recipient: message.recipient,
        groupId: message.groupId,
        content: message.content,
        createdAt: message.createdAt,
        readBy: message.readBy,
      });
    } catch (dbError) {
      console.error("Database error marking message as read:", dbError);
      res.status(500).json({ error: "Database operation failed" });
    }
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({ error: "Failed to mark message as read" });
  }
};

// Edit message
export const editMessage: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const { messageId, content } = req.body;

    if (!messageId || !content) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const collections = getCollections();
    const result = await collections.chatMessages.findOneAndUpdate(
      { _id: new ObjectId(messageId), sender: req.userId },
      {
        $set: {
          content,
          editedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" },
    );

    if (!result.value) {
      res
        .status(403)
        .json({ error: "Message not found or you don't have permission" });
      return;
    }

    const message = result.value;
    res.json({
      _id: message._id.toString(),
      sender: message.sender,
      senderName: message.senderName,
      senderPicture: message.senderPicture,
      recipient: message.recipient,
      groupId: message.groupId,
      content: message.content,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
    });
  } catch (error) {
    console.error("Error editing message:", error);
    res.status(500).json({ error: "Failed to edit message" });
  }
};

// Delete message
export const deleteMessage: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const { messageId } = req.body;

    if (!messageId) {
      res.status(400).json({ error: "Missing messageId" });
      return;
    }

    const collections = getCollections();
    const result = await collections.chatMessages.findOneAndUpdate(
      { _id: new ObjectId(messageId), sender: req.userId },
      {
        $set: {
          deleted: true,
          deletedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" },
    );

    if (!result.value) {
      res
        .status(403)
        .json({ error: "Message not found or you don't have permission" });
      return;
    }

    const message = result.value;
    res.json({
      _id: message._id.toString(),
      sender: message.sender,
      senderName: message.senderName,
      senderPicture: message.senderPicture,
      recipient: message.recipient,
      groupId: message.groupId,
      content: message.content,
      createdAt: message.createdAt,
      deleted: message.deleted,
      deletedAt: message.deletedAt,
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
};
