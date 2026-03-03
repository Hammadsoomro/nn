import { User } from "@shared/api";
import { Mail, Shield, Calendar } from "lucide-react";
import { formatDateOnly } from "@/lib/utils";

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

interface TeamMemberCardProps {
  member: User;
  index?: number;
}

export function TeamMemberCard({ member }: TeamMemberCardProps) {
  return (
    <div className="bg-card border border-border/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-secondary-foreground flex-shrink-0 group-hover:scale-110 transition-transform">
          {getInitials(member.name)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="space-y-0.5">
            <h3 className="font-bold text-foreground text-lg truncate leading-tight">
              {member.name}
            </h3>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Shield className="h-3 w-3" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {member.role}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
              <Mail className="h-3.5 w-3.5" />
              <span className="text-xs font-medium truncate">{member.email}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs font-medium truncate">
                Joined {formatDateOnly(member.createdAt)}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Today</p>
              <p className="text-sm font-bold text-foreground">{member.claimsToday || 0}</p>
            </div>
            <div className="space-y-0.5 text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Total</p>
              <p className="text-sm font-bold text-foreground">{member.totalClaims || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
