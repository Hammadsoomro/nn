import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle,
  Phone,
  Video,
  MoreVertical,
  Search,
  Send,
  Menu,
  X,
  Bell,
  BellOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Contact {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  content: string;
  timestamp: Date;
  senderName?: string;
}

export default function Chat() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<{ [key: string]: number }>(
    {},
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      console.log(
        "Notification API available. Current permission:",
        Notification.permission,
      );
      if (Notification.permission === "granted") {
        setNotificationsEnabled(true);
        console.log("Notifications already granted");
      } else if (Notification.permission === "default") {
        console.log(
          "Notification permission is default, not requesting automatically",
        );
      } else if (Notification.permission === "denied") {
        console.log("Notifications are denied by user");
      }
    } else {
      console.log("Notification API not available in this browser");
    }
  }, []);

  const showDesktopNotification = (
    senderName: string,
    messageContent: string,
  ) => {
    if ("Notification" in window) {
      console.log("Checking notification permission:", Notification.permission);
      if (Notification.permission === "granted") {
        try {
          const notification = new Notification(
            "New Message from " + senderName,
            {
              body: messageContent,
              icon: "/placeholder.svg",
              badge: "/placeholder.svg",
              tag: "message-notification",
              requireInteraction: false,
            },
          );

          notification.onclick = () => {
            console.log("Notification clicked");
            window.focus();
            notification.close();
          };

          notification.onerror = (error) => {
            console.error("Notification error:", error);
          };

          console.log("Desktop notification sent to:", senderName);
        } catch (error) {
          console.error("Failed to create notification:", error);
        }
      } else {
        console.log(
          "Notification permission not granted:",
          Notification.permission,
        );
      }
    } else {
      console.log("Notification API not available");
    }
  };

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/members", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setContacts(data);
        } else {
          toast.error("Failed to load contacts");
        }
      } catch (error) {
        console.error("Failed to load contacts:", error);
        toast.error("Failed to load contacts");
      } finally {
        setIsLoading(false);
      }
    };

    loadContacts();
  }, []);

  useEffect(() => {
    if (!socket || !user) return;

    socket.on("new-message", (message: any) => {
      console.log("[Socket] Received message:", message);
      const formattedMessage: ChatMessage = {
        _id: message.messageId || message._id || Date.now().toString(),
        sender: message.sender || message.senderId,
        content: message.content,
        createdAt: message.timestamp || new Date().toISOString(),
        senderName: message.senderName,
      };

      // Create a compatible message for local display
      const displayMessage = {
        id: message.messageId || message._id || Date.now().toString(),
        senderId: message.sender || message.senderId,
        receiverId: message.receiverId || message.recipient,
        content: message.content,
        timestamp: new Date(message.timestamp || new Date()),
        senderName: message.senderName,
      };

      console.log("[Chat] Display message:", displayMessage);
      console.log("[Chat] Selected contact:", selectedContact);
      console.log("[Chat] User ID:", user?._id);

      // Show desktop notification regardless of focused tab
      showDesktopNotification(
        displayMessage.senderName || "Team Member",
        displayMessage.content,
      );

      // Add message if it's between current user and selected contact
      if (selectedContact) {
        const isFromSelectedContact = displayMessage.senderId === selectedContact._id;
        const isFromCurrentUser = displayMessage.senderId === user._id;

        // For direct messaging, if message is in our chat, add it
        if (
          (isFromSelectedContact) ||
          (isFromCurrentUser)
        ) {
          console.log("[Chat] Message is for selected contact, adding to messages");
          setMessages((prev) => [...prev, displayMessage]);
          if (!isFromCurrentUser) {
            playNotificationSound();
          }
        }
      } else if (!selectedContact) {
        console.log("[Chat] No contact selected, showing toast");
        setUnreadCounts((prev) => ({
          ...prev,
          [displayMessage.senderId]: (prev[displayMessage.senderId] || 0) + 1,
        }));
        playNotificationSound();
        toast.custom(
          (t) => (
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top">
              <div className="bg-white bg-opacity-20 rounded-full p-2">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">
                  {displayMessage.senderName || "New Message"}
                </p>
                <p className="text-sm text-blue-100 truncate">
                  {displayMessage.content}
                </p>
              </div>
              <button
                onClick={() => toast.dismiss(t)}
                className="text-blue-200 hover:text-white transition"
              >
                ✕
              </button>
            </div>
          ),
          {
            duration: 4000,
            position: "top-center",
          },
        );
      }
    });

    return () => {
      socket.off("new-message");
    };
  }, [socket, user, selectedContact]);

  const playNotificationSound = () => {
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.1,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const handleSelectContact = async (contact: Contact) => {
    setSelectedContact(contact);
    setUnreadCounts((prev) => ({
      ...prev,
      [contact._id]: 0,
    }));

    // Create a consistent room ID for both users (smaller ID first)
    if (socket && user?._id) {
      const roomId = [user._id, contact._id].sort().join("_");
      console.log(`[Chat] Joining room: ${roomId}`);
      socket.emit("join-chat", {
        chatId: roomId,
        userId: user._id,
      });
    }

    // Load messages from database
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/chat/messages?recipient=${contact._id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const messages = await response.json();
        setMessages(
          messages.map((msg: any) => ({
            id: msg._id,
            senderId: msg.sender,
            receiverId: msg.recipient,
            content: msg.content,
            timestamp: new Date(msg.createdAt),
            senderName: msg.senderName,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !socket || !selectedContact || !user) return;

    // Create consistent room ID (same as in handleSelectContact)
    const roomId = [user._id, selectedContact._id].sort().join("_");

    // Generate unique message ID (timestamp + random suffix to avoid collisions)
    const messageId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const messageData = {
      messageId,
      sender: user._id,
      senderName: user.name,
      recipient: selectedContact._id,
      chatId: roomId,
      content: messageInput.trim(),
      timestamp: new Date().toISOString(),
    };

    // Emit to socket for real-time delivery
    socket.emit("send-message", messageData);

    // Add message to local state
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        senderId: user._id,
        receiverId: selectedContact._id,
        content: messageInput,
        timestamp: new Date(),
        senderName: user.name,
      },
    ]);

    setMessageInput("");
  };

  return (
    <Layout>
      <div className="flex h-screen bg-gray-100">
      <aside
        className={`${sidebarOpen ? "w-80" : "w-20"
          } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col shadow-lg`}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {sidebarOpen && (
            <h2 className="text-lg font-bold text-gray-900">Messages</h2>
          )}
          <div className="flex items-center gap-2">
            {sidebarOpen && "Notification" in window && (
              <button
                onClick={() => {
                  if (Notification.permission === "default") {
                    Notification.requestPermission().then((permission) => {
                      if (permission === "granted") {
                        setNotificationsEnabled(true);
                        toast.success("Desktop notifications enabled! ✅");
                      } else {
                        toast.error("Notification permission was denied");
                      }
                    });
                  } else if (Notification.permission === "granted") {
                    toast.success("Desktop notifications are enabled ✅");
                  } else {
                    toast.error(
                      "Notifications blocked in browser settings. Click the lock icon in the address bar, set Notifications to Allow, then refresh. 🔒",
                      { duration: 5000 },
                    );
                  }
                }}
                className={`p-2 rounded-lg transition ${notificationsEnabled || Notification.permission === "granted"
                    ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                    : "text-gray-600 hover:bg-gray-100"
                  }`}
                title="Toggle desktop notifications"
              >
                {notificationsEnabled ||
                  Notification.permission === "granted" ? (
                  <Bell className="w-5 h-5" />
                ) : (
                  <BellOff className="w-5 h-5" />
                )}
              </button>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {sidebarOpen && (
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search contacts..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                Loading contacts...
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No contacts found
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <button
                  key={contact._id}
                  onClick={() => handleSelectContact(contact)}
                  className={`w-full p-3 rounded-lg transition-all duration-200 text-left flex items-center justify-between ${selectedContact?._id === contact._id
                      ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900 shadow-md border border-blue-200"
                      : "hover:bg-gray-50 text-gray-900 border border-transparent hover:border-gray-300"
                    }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{contact.name}</p>
                    {sidebarOpen && (
                      <p className="text-xs text-gray-500 truncate">
                        {contact.email}
                      </p>
                    )}
                  </div>
                  {unreadCounts[contact._id] > 0 && (
                    <div className="ml-2 flex items-center justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-pulse"></div>
                        <Badge className="relative ml-2 bg-red-500 text-white font-bold shadow-lg">
                          {unreadCounts[contact._id]}
                        </Badge>
                      </div>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>

      <main className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedContact.name}
                </h3>
                <p className="text-sm text-gray-500">{selectedContact.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <Phone className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <Video className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === user?._id
                        ? "justify-end"
                        : "justify-start"
                      }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${message.senderId === user?._id
                          ? "bg-blue-600 text-white rounded-br-none"
                          : "bg-gray-200 text-gray-900 rounded-bl-none"
                        }`}
                    >
                      <p className="break-words">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="bg-white border-t border-gray-200 p-4">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-3"
              >
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={!isConnected}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!isConnected || !messageInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              {!isConnected && (
                <p className="text-xs text-red-600 mt-2">
                  Connecting to server...
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No chat selected
              </h3>
              <p className="text-gray-600">
                Select a contact to start messaging
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
    </Layout>
  );
}
