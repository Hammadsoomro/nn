import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatTime } from "@/lib/utils";
import { Send, Users } from "lucide-react";
import { Socket } from "socket.io-client";
import type { ChatMessage } from "@shared/api";

interface ChatViewProps {
  contact: {
    id: string;
    name: string;
    type: "group" | "direct";
  } | null;
  token: string | null;
  socket: Socket | null;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function ChatViewFixed({ contact, token, socket }: ChatViewProps) {
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch messages when contact changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!contact || !token) {
        setMessages([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(
          `/api/chat/messages?chatId=${contact.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        } else {
          console.error(
            "[ChatView] Failed to fetch messages:",
            response.status,
          );
        }
      } catch (error) {
        console.error("[ChatView] Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [contact, token]);

  // Setup socket listeners
  useEffect(() => {
    if (!socket || !user?._id || !contact) return;

    // Listen for new messages
    const handleNewMessage = (data: any) => {
      if (data.chatId === contact.id && data.sender !== user._id) {
        const newMsg: ChatMessage = {
          _id: data.messageId || data._id,
          sender: data.sender,
          senderName: data.senderName,
          content: data.content,
          createdAt: data.timestamp,
          readBy: [data.sender],
        };

        setMessages((prev) => {
          if (prev.some((msg) => msg._id === newMsg._id)) {
            return prev;
          }
          return [...prev, newMsg];
        });
      }
    };

    socket.on("new-message", handleNewMessage);

    return () => {
      socket.off("new-message", handleNewMessage);
    };
  }, [socket, user?._id, contact]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !contact || !token) return;

    setSending(true);

    try {
      // Optimistic update
      const tempMessage: ChatMessage = {
        _id: `temp-${Date.now()}`,
        sender: user._id,
        senderName: user.name,
        content: newMessage.trim(),
        createdAt: new Date().toISOString(),
        readBy: [user._id],
      };

      setMessages((prev) => [...prev, tempMessage]);
      setNewMessage("");

      // Send to backend
      const response = await fetch("/api/chat/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          [contact.type === "group" ? "groupId" : "recipient"]: contact.id,
        }),
      });

      if (!response.ok) {
        console.error("[ChatView] Failed to send message:", response.status);
        // Remove optimistic message on error
        setMessages((prev) =>
          prev.filter((msg) => msg._id !== tempMessage._id),
        );
        setNewMessage(newMessage);
      } else {
        // Remove temp message and it will be added via socket
        setMessages((prev) =>
          prev.filter((msg) => msg._id !== tempMessage._id),
        );
      }
    } catch (error) {
      console.error("[ChatView] Error sending message:", error);
      // Restore message on error
      setNewMessage(newMessage);
    } finally {
      setSending(false);
    }
  };

  if (!user || !contact) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a chat to start messaging
      </div>
    );
  }

  const chatName = contact.name;
  const isGroupChat = contact.type === "group";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="p-4 border-b flex items-center gap-3">
        {isGroupChat ? (
          <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary/20 text-primary">
            <Users className="h-4 w-4" />
          </div>
        ) : (
          <Avatar className="h-8 w-8">
            <AvatarFallback>{getInitials(chatName)}</AvatarFallback>
          </Avatar>
        )}
        <h3 className="text-lg font-semibold">{chatName}</h3>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No messages yet</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = msg.sender === user._id;
              return (
                <div
                  key={msg._id}
                  className={`flex items-end gap-2 ${isOwnMessage ? "justify-end" : ""}`}
                >
                  {!isOwnMessage && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback>
                        {getInitials(msg.senderName)}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <div
                    className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                      isOwnMessage
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {!isOwnMessage && (
                      <p className="text-xs font-semibold mb-1 opacity-70">
                        {msg.senderName}
                      </p>
                    )}
                    <p className="text-sm break-words">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>

                  {isOwnMessage && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <footer className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
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
      </footer>
    </div>
  );
}
