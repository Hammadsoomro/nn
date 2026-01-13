import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";
import type { User } from "@shared/api";

interface Contact {
  id: string;
  name: string;
  type: "group" | "direct";
}

interface ContactListFixedProps {
  selectedContact: Contact | null;
  onSelectContact: (contact: Contact | null) => void;
  teamMembers: User[];
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function ContactListFixed({
  selectedContact,
  onSelectContact,
  teamMembers,
}: ContactListFixedProps) {
  const { user } = useAuth();

  if (!user) return null;

  // Filter out current user from team members
  const otherMembers = teamMembers.filter((m) => m._id !== user._id);

  return (
    <div className="flex flex-col h-full">
      <h2 className="p-4 text-xl font-semibold">Team Chat</h2>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* Group Chat */}
          <button
            onClick={() =>
              onSelectContact({
                id: "group-chat",
                name: "Team Group",
                type: "group",
              })
            }
            className={cn(
              "flex items-center w-full p-3 rounded-lg text-left transition-colors",
              selectedContact?.type === "group" &&
                selectedContact?.id === "group-chat"
                ? "bg-muted"
                : "hover:bg-muted/50",
            )}
          >
            <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary/20 text-primary mr-3 flex-shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">Team Group</p>
              <p className="text-xs text-muted-foreground truncate">
                {otherMembers.length} members
              </p>
            </div>
          </button>

          {/* Team Members - Direct Messages */}
          {otherMembers.length > 0 && (
            <>
              <div className="px-3 py-2 mt-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  DIRECT MESSAGES
                </p>
              </div>

              {otherMembers.map((member) => (
                <button
                  key={member._id}
                  onClick={() =>
                    onSelectContact({
                      id: member._id,
                      name: member.name,
                      type: "direct",
                    })
                  }
                  className={cn(
                    "flex items-center w-full p-3 rounded-lg text-left transition-colors",
                    selectedContact?.type === "direct" &&
                      selectedContact?.id === member._id
                      ? "bg-muted"
                      : "hover:bg-muted/50",
                  )}
                >
                  <Avatar className="h-10 w-10 mr-3 flex-shrink-0">
                    <AvatarImage
                      src={member.profilePicture}
                      alt={member.name}
                    />
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{member.email.split("@")[0]}
                    </p>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* No members message */}
          {otherMembers.length === 0 && (
            <div className="p-4 text-center text-muted-foreground">
              <p className="text-sm">No team members yet</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
