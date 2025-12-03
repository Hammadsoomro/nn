import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
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
        const response = await fetch("/api/team/info", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setContacts(data.contacts || []);
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

    socket.on("new_message", (message: ChatMessage) => {
      // Show desktop notification regardless of focused tab
      showDesktopNotification(
        message.senderName || "Team Member",
        message.content,
      );

      if (selectedContact && message.senderId === selectedContact._id) {
        setMessages((prev) => [...prev, message]);
        playNotificationSound();
      } else {
        setUnreadCounts((prev) => ({
          ...prev,
          [message.senderId]: (prev[message.senderId] || 0) + 1,
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
                  {message.senderName || "New Message"}
                </p>
                <p className="text-sm text-blue-100 truncate">
                  {message.content}
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

    socket.on("group_message", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      playNotificationSound();
    });

    return () => {
      socket.off("new_message");
      socket.off("group_message");
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

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setMessages([]);
    setUnreadCounts((prev) => ({
      ...prev,
      [contact._id]: 0,
    }));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !socket || !selectedContact || !user) return;

    socket.emit("send_message", {
      senderId: user.id,
      receiverId: selectedContact._id,
      content: messageInput.trim(),
    });

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        senderId: user.id,
        receiverId: selectedContact._id,
        content: messageInput,
        timestamp: new Date(),
        senderName: user.name,
      },
    ]);

    setMessageInput("");
  };

  return (
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
                    className={`flex ${message.senderId === user?.id
                        ? "justify-end"
                        : "justify-start"
                      }`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${message.senderId === user?.id
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
  );
}
