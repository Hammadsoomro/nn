import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

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
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch contacts
  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery<Contact[]>({
    queryKey: ["members"],
    queryFn: () => apiFetch("/api/members", { token }),
    enabled: !!token,
  });

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Fetch messages with polling fallback
  const { data: rawMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["chat-messages", selectedContact?._id],
    queryFn: () => apiFetch(`/api/chat/messages?recipient=${selectedContact?._id}`, { token }),
    enabled: !!token && !!selectedContact,
    refetchInterval: 3000, // Poll every 3s in case sockets are down
  });

  const messages: ChatMessage[] = rawMessages.map((msg: any) => ({
    id: msg._id,
    senderId: msg.sender,
    receiverId: msg.recipient,
    content: msg.content,
    timestamp: new Date(msg.createdAt),
    senderName: msg.senderName,
  }));

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => {
      if (!selectedContact || !user) throw new Error("No contact selected");
      return apiFetch("/api/chat/send", {
        method: "POST",
        token,
        body: JSON.stringify({
          recipient: selectedContact._id,
          content,
        }),
      });
    },
    onMutate: async (content) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ["chat-messages", selectedContact?._id] });
      const previousMessages = queryClient.getQueryData<any[]>(["chat-messages", selectedContact?._id]);

      const newMessage = {
        _id: `temp-${Date.now()}`,
        sender: user?._id,
        recipient: selectedContact?._id,
        content,
        createdAt: new Date().toISOString(),
        senderName: user?.name,
      };

      queryClient.setQueryData(["chat-messages", selectedContact?._id], [...(previousMessages || []), newMessage]);
      return { previousMessages };
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", selectedContact?._id] });
    },
    onError: (err, content, context) => {
      queryClient.setQueryData(["chat-messages", selectedContact?._id], context?.previousMessages);
      toast.error("Failed to send message");
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true);
    }
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedContact || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(messageInput.trim());
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    if (socket && user?._id) {
      const roomId = [user._id, contact._id].sort().join("_");
      socket.emit("join-chat", { chatId: roomId, userId: user._id });
    }
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
            {isLoadingContacts ? (
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
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={sendMessageMutation.isPending || !messageInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
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
