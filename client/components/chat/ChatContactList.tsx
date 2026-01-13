import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Users, MessageCircle } from "lucide-react";

interface ChatConversation {
  type: "group" | "direct";
  id: string;
  name: string;
  unreadCount: number;
  lastMessageTime?: string;
  member?: any;
  group?: any;
}

interface ChatContactListProps {
  conversations: ChatConversation[];
  selectedChat: {
    type: "group" | "direct";
    id: string;
    name: string;
  } | null;
  onSelectChat: (conversation: ChatConversation) => void;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function ChatContactList({
  conversations,
  selectedChat,
  onSelectChat,
}: ChatContactListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Messages</h2>
      </div>

      {/* Contacts List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <button
                key={`${conversation.type}-${conversation.id}`}
                onClick={() => onSelectChat(conversation)}
                className={`w-full p-3 rounded-lg transition-colors flex items-center gap-3 relative ${
                  selectedChat?.type === conversation.type &&
                  selectedChat?.id === conversation.id
                    ? "bg-primary/10"
                    : "hover:bg-muted"
                }`}
              >
                {/* Avatar */}
                {conversation.type === "group" ? (
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                ) : (
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage
                      src={
                        conversation.member?.profilePictureUrl ||
                        conversation.member?.profilePicture
                      }
                    />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {getInitials(conversation.name)}
                    </AvatarFallback>
                  </Avatar>
                )}

                {/* Name and info */}
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium text-sm truncate">{conversation.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {conversation.type === "group"
                      ? `${conversation.group?.members?.length || 0} members`
                      : conversation.member?.email || "Direct message"}
                  </p>
                </div>

                {/* Unread Badge */}
                {conversation.unreadCount > 0 && (
                  <div className="flex-shrink-0 ml-2">
                    <div className="h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                      {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                    </div>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
