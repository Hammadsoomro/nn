import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  CheckCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import type { ChatMessage } from "@shared/api";
import { Socket } from "socket.io-client";

interface ChatAreaProps {
  selectedChat: {
    type: "group" | "direct";
    id: string;
    name: string;
  };
  token: string | null;
  socket: Socket | null;
}

interface TypingIndicator {
  userId: string;
  senderName: string;
  isTyping: boolean;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function ChatArea({ selectedChat, token, socket }: ChatAreaProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingIndicator>>(
    new Map(),
  );
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const markedAsReadRef = useRef<Set<string>>(new Set());
  const previousChatIdRef = useRef<string | null>(null);

  // Setup socket listeners for this chat
  useEffect(() => {
    if (!socket || !user?._id) {
      console.log("[ChatArea] Socket not available, skipping setup");
      return;
    }

    console.log(
      "[ChatArea] Setting up socket listeners for chat:",
      selectedChat.id,
    );

    // Leave previous chat room if switching chats
    if (
      previousChatIdRef.current &&
      previousChatIdRef.current !== selectedChat.id
    ) {
      socket.emit("leave-chat", { chatId: previousChatIdRef.current });
      console.log("[ChatArea] Left previous chat:", previousChatIdRef.current);
    }

    previousChatIdRef.current = selectedChat.id;

    // Join the chat room
    socket.emit("join-chat", {
      chatId: selectedChat.id,
      userId: user._id,
    });

    // Listen for new messages - only add messages from OTHER users
    const handleNewMessage = (data: any) => {
      console.log("[ChatArea] New message received:", data);
      // Only add messages from other users in the current chat
      if (data.chatId === selectedChat.id && data.sender !== user._id) {
        setMessages((prev) => {
          // Check if message already exists (prevent duplicates)
          const messageId = data.messageId || data._id;
          if (prev.some((msg) => msg._id === messageId)) {
            console.log("[ChatArea] Message already exists:", messageId);
            return prev;
          }

          const newMsg: ChatMessage = {
            _id: messageId,
            sender: data.sender,
            senderName: data.senderName,
            senderPicture: data.senderPicture,
            content: data.content,
            createdAt: data.timestamp || data.createdAt,
            groupId: data.groupId,
            recipient: data.recipient,
            readBy: data.readBy || [],
          };
          console.log("[ChatArea] Adding new message:", messageId);

          // Auto-mark received message as read
          if (!markedAsReadRef.current.has(messageId) && token) {
            markedAsReadRef.current.add(messageId);

            // Call REST API to mark as read
            fetch("/api/chat/mark-read", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ messageId }),
            }).catch((err) => {
              console.error(
                "[ChatArea] Failed to mark received message as read:",
                messageId,
                err,
              );
            });

            // Emit Socket.IO event to notify others
            if (socket) {
              socket.emit("message-read", {
                messageId,
                userId: user?._id,
                chatId: selectedChat.id,
              });
            }
          }

          return [...prev, newMsg];
        });
      }
    };

    const handleMessageEdited = (data: any) => {
      if (data.chatId === selectedChat.id) {
        console.log("[ChatArea] Message edited:", data.messageId);
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === data.messageId
              ? {
                  ...msg,
                  content: data.content,
                  editedAt: new Date().toISOString(),
                }
              : msg,
          ),
        );
      }
    };

    const handleMessageDeleted = (data: any) => {
      if (data.chatId === selectedChat.id) {
        console.log("[ChatArea] Message deleted:", data.messageId);
        setMessages((prev) => prev.filter((msg) => msg._id !== data.messageId));
      }
    };

    const handleUserTyping = (data: any) => {
      console.log("[ChatArea] User typing:", data.userId, data.isTyping);
      if (data.isTyping) {
        setTypingUsers((prev) => {
          const updated = new Map(prev);
          updated.set(data.userId, {
            userId: data.userId,
            senderName: data.senderName,
            isTyping: true,
          });
          return updated;
        });

        // Auto-remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => {
            const updated = new Map(prev);
            updated.delete(data.userId);
            return updated;
          });
        }, 3000);
      } else {
        setTypingUsers((prev) => {
          const updated = new Map(prev);
          updated.delete(data.userId);
          return updated;
        });
      }
    };

    const handleMessageRead = (data: any) => {
      console.log("[ChatArea] Message read:", data.messageId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId
            ? {
                ...msg,
                readBy: [...(msg.readBy || []), data.userId],
              }
            : msg,
        ),
      );
    };

    // Setup all listeners
    socket.on("new-message", handleNewMessage);
    socket.on("message-edited", handleMessageEdited);
    socket.on("message-deleted", handleMessageDeleted);
    socket.on("user-typing", handleUserTyping);
    socket.on("message-read", handleMessageRead);

    // Fetch initial messages
    fetchInitialMessages();

    return () => {
      // Remove all listeners
      socket.off("new-message", handleNewMessage);
      socket.off("message-edited", handleMessageEdited);
      socket.off("message-deleted", handleMessageDeleted);
      socket.off("user-typing", handleUserTyping);
      socket.off("message-read", handleMessageRead);
    };
  }, [socket, selectedChat.id, selectedChat.type, user?._id, token]);

  // Fetch initial messages and mark unread messages as read
  const fetchInitialMessages = async () => {
    if (!token) return;

    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (selectedChat.type === "group") {
        params.append("groupId", selectedChat.id);
      } else {
        params.append("recipient", selectedChat.id);
      }

      // Set timeout for initial message fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`/api/chat/messages?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(
          "[ChatArea] Failed to fetch messages:",
          response.status,
          response.statusText,
        );
        setLoading(false);
        return;
      }

      const data = await response.json();
      const filtered = data.filter((msg: ChatMessage) => !msg.deleted);
      setMessages(filtered);
      console.log("[ChatArea] Loaded messages:", filtered.length);

      // Mark all unread messages from other users as read (async, non-blocking)
      const unreadMessages = filtered.filter(
        (msg: ChatMessage) =>
          msg.sender !== user?._id && !msg.readBy?.includes(user?._id || ""),
      );

      if (unreadMessages.length > 0 && socket && token) {
        // Mark messages as read via REST API and WebSocket
        const markAsReadPromises = unreadMessages.map(async (msg) => {
          markedAsReadRef.current.add(msg._id);

          try {
            // Call REST API to persist read status in database
            await fetch("/api/chat/mark-read", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ messageId: msg._id }),
            });

            // Broadcast via WebSocket to update other clients
            socket.emit("message-read", {
              messageId: msg._id,
              userId: user?._id,
              chatId: selectedChat.id,
            });
          } catch (err) {
            console.error(
              "[ChatArea] Failed to mark message as read:",
              msg._id,
              err,
            );
          }
        });

        await Promise.all(markAsReadPromises);
        console.log(
          "[ChatArea] Marked",
          unreadMessages.length,
          "messages as read",
        );
      }

      setLoading(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.error("[ChatArea] Message fetch timeout");
      } else {
        console.error("[ChatArea] Error fetching messages:", error);
      }
      setLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    // Use requestAnimationFrame for smoother scrolling
    const scrollTimer = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    });
    return () => cancelAnimationFrame(scrollTimer);
  }, [messages, typingUsers]);

  const handleTyping = () => {
    if (!socket) return;

    if (!isTyping) {
      socket.emit("typing", {
        chatId: selectedChat.id,
        userId: user?._id,
        senderName: user?.name || "Unknown",
        isTyping: true,
      });
      setIsTyping(true);
      console.log("[ChatArea] User started typing");
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (socket) {
        socket.emit("typing", {
          chatId: selectedChat.id,
          userId: user?._id,
          senderName: user?.name || "Unknown",
          isTyping: false,
        });
      }
      setIsTyping(false);
      console.log("[ChatArea] User stopped typing");
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !token || !socket) return;

    const tempMessageId = `temp_${Date.now()}_${Math.random()}`;
    const messageContent = newMessage;

    try {
      setSending(true);

      // Add optimistic message to UI immediately
      const tempMsg: ChatMessage = {
        _id: tempMessageId,
        sender: user?._id || "",
        senderName: user?.name || "Unknown",
        senderPicture: user?.profilePictureUrl || user?.profilePicture,
        content: messageContent,
        createdAt: new Date().toISOString(),
        groupId: selectedChat.type === "group" ? selectedChat.id : undefined,
        recipient: selectedChat.type === "direct" ? selectedChat.id : undefined,
        readBy: [user?._id || ""],
      };
      setMessages((prev) => [...prev, tempMsg]);
      setNewMessage("");

      const payload: any = {
        content: messageContent,
      };

      if (selectedChat.type === "group") {
        payload.groupId = selectedChat.id;
      } else {
        payload.recipient = selectedChat.id;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const sentMessage = await response.json();
        const actualMessageId = sentMessage._id || sentMessage.insertedId;

        console.log("[ChatArea] Message sent:", actualMessageId);

        // Update the temp message with the real ID from server
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === tempMessageId
              ? {
                  ...msg,
                  _id: actualMessageId,
                  createdAt: sentMessage.createdAt || msg.createdAt,
                }
              : msg,
          ),
        );

        // Emit the message through WebSocket so all users see it in real-time
        const messageData = {
          messageId: actualMessageId,
          sender: user?._id,
          senderName: user?.name || "Unknown",
          chatId: selectedChat.id,
          content: messageContent,
          timestamp: sentMessage.createdAt || new Date().toISOString(),
        };

        socket.emit("send-message", messageData);

        // Clear typing indicator
        socket.emit("typing", {
          chatId: selectedChat.id,
          userId: user?._id,
          senderName: user?.name || "Unknown",
          isTyping: false,
        });

        setIsTyping(false);
      } else {
        // Remove optimistic message if send failed
        setMessages((prev) => prev.filter((msg) => msg._id !== tempMessageId));
        console.error("[ChatArea] Failed to send message:", response.status);
      }
    } catch (error) {
      // Remove optimistic message if error occurred
      setMessages((prev) => prev.filter((msg) => msg._id !== tempMessageId));

      if (error instanceof DOMException && error.name === "AbortError") {
        console.error("[ChatArea] Send message timeout");
      } else {
        console.error("[ChatArea] Error sending message:", error);
      }
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim() || !token || !socket) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("/api/chat/edit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageId,
          content: editContent,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const updated = await response.json();
        setMessages(
          messages.map((msg) => (msg._id === messageId ? updated : msg)),
        );

        // Emit edit through WebSocket
        socket.emit("edit-message", {
          messageId,
          content: editContent,
          chatId: selectedChat.id,
        });

        console.log("[ChatArea] Message edited:", messageId);

        setEditingId(null);
        setEditContent("");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.error("[ChatArea] Edit message timeout");
      } else {
        console.error("[ChatArea] Error editing message:", error);
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!token || !socket) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("/api/chat/delete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messageId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setMessages(messages.filter((msg) => msg._id !== messageId));

        // Emit delete through WebSocket
        socket.emit("delete-message", {
          messageId,
          chatId: selectedChat.id,
        });

        console.log("[ChatArea] Message deleted:", messageId);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.error("[ChatArea] Delete message timeout");
      } else {
        console.error("[ChatArea] Error deleting message:", error);
      }
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    if (!socket) return;

    // Prevent marking the same message as read multiple times
    if (markedAsReadRef.current.has(messageId)) {
      return;
    }

    markedAsReadRef.current.add(messageId);

    try {
      // Use WebSocket for marking as read (more efficient)
      socket.emit("message-read", {
        messageId,
        userId: user?._id,
        chatId: selectedChat.id,
      });
      console.log("[ChatArea] Message marked as read:", messageId);
    } catch (error) {
      console.error("Error marking message as read:", error);
      markedAsReadRef.current.delete(messageId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-lg">{selectedChat.name}</h3>
        {selectedChat.type === "group" && (
          <p className="text-xs text-muted-foreground">
            Group Chat {socket?.connected ? "● Online" : "● Offline"}
          </p>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 && typingUsers.size === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex gap-3 group ${
                    message.sender === user?._id ? "flex-row-reverse" : ""
                  }`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={message.senderPicture} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {getInitials(message.senderName)}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`flex flex-col gap-1 max-w-xs ${
                      message.sender === user?._id ? "items-end" : ""
                    }`}
                  >
                    <div className="flex gap-2 items-center">
                      {editingId === message._id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="h-8 text-sm max-w-xs"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleEditMessage(message._id)}
                            className="h-8 px-2"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            className="h-8 px-2"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div
                            className={`px-3 py-2 rounded-lg text-sm ${
                              message.sender === user?._id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p>{message.content}</p>
                            {message.editedAt && (
                              <p className="text-xs opacity-70 mt-1">
                                (edited)
                              </p>
                            )}
                          </div>

                          {message.sender === user?._id && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity">
                                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align={
                                  message.sender === user?._id ? "end" : "start"
                                }
                              >
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingId(message._id);
                                    setEditContent(message.content);
                                  }}
                                >
                                  <Edit2 className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDeleteMessage(message._id)
                                  }
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {message.senderName}
                      </span>
                      {message.sender === user?._id && (
                        <span className="text-xs text-muted-foreground">
                          {message.readBy && message.readBy.length > 0 ? (
                            <CheckCheck className="h-3 w-3 inline text-blue-500" />
                          ) : (
                            <Check className="h-3 w-3 inline" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicators */}
              {typingUsers.size > 0 && (
                <div className="flex gap-3 items-center text-sm text-muted-foreground py-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{
                          animationDelay: `${i * 150}ms`,
                        }}
                      />
                    ))}
                  </div>
                  <span>
                    {Array.from(typingUsers.values())
                      .map((t) => t.senderName)
                      .join(", ")}
                    {typingUsers.size === 1 ? " is" : " are"} typing...
                  </span>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            disabled={sending}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !newMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
