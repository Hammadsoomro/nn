import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    refetchInterval: 3000,
  });

  const messages: ChatMessage[] = rawMessages.map((msg: any) => ({
    id: msg._id,
    senderId: msg.sender,
    receiverId: msg.recipient,
    content: msg.content,
    timestamp: new Date(msg.createdAt),
    senderName: msg.senderName,
  }));

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
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-64px)] bg-background">
        <aside
          className={`${sidebarOpen ? "w-80" : "w-0 overflow-hidden"
            } bg-card border-r border-border transition-all duration-300 flex flex-col shadow-sm`}
        >
          <div className="p-4 border-b border-border flex items-center justify-between bg-card/50">
            <h2 className="text-lg font-bold text-foreground">Messages</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-secondary rounded-lg md:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-border bg-card/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                className="pl-10 bg-background border-border/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {isLoadingContacts ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Loading...
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No contacts found
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact._id}
                    onClick={() => handleSelectContact(contact)}
                    className={`w-full p-3 rounded-xl transition-all text-left flex items-center gap-3 ${selectedContact?._id === contact._id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "hover:bg-secondary/50 text-foreground border border-transparent"
                      }`}
                  >
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {contact.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-sm">{contact.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate font-medium">
                        {contact.role}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        {!sidebarOpen && (
           <button
             onClick={() => setSidebarOpen(true)}
             className="absolute left-4 top-20 z-10 p-2 bg-card border border-border rounded-lg shadow-md"
           >
             <Menu className="w-5 h-5" />
           </button>
        )}

        <main className="flex-1 flex flex-col bg-background/50 relative">
          {selectedContact ? (
            <>
              <div className="bg-card/80 backdrop-blur-md border-b border-border p-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                    {selectedContact.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {selectedContact.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-medium">{selectedContact.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                    <Video className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === user?._id
                          ? "justify-end"
                          : "justify-start"
                        }`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-sm ${message.senderId === user?._id
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-card text-foreground border border-border/50 rounded-tl-none"
                          }`}
                      >
                        <p className="text-sm leading-relaxed">{message.content}</p>
                        <p className={`text-[10px] mt-1.5 font-medium opacity-70 ${message.senderId === user?._id ? "text-primary-foreground" : "text-muted-foreground"}`}>
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <div className="p-4 bg-card/30 border-t border-border">
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-center gap-3 bg-card border border-border p-1.5 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all"
                >
                  <Input
                    placeholder="Type a message..."
                    className="border-none bg-transparent shadow-none focus-visible:ring-0 text-sm h-10"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={sendMessageMutation.isPending || !messageInput.trim()}
                    className="h-10 w-10 rounded-xl flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div className="max-w-md space-y-4 opacity-40">
                <div className="h-20 w-20 rounded-3xl bg-muted flex items-center justify-center mx-auto">
                  <MessageCircle className="w-10 h-10 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-foreground">
                    Connect with your team
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Select a contact from the list to start a conversation and collaborate in real-time.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}
