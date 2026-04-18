import { Layout } from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import {
  BarChart3,
  Clock,
  Users,
  List,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useEffect } from "react";
import type { User } from "@shared/api";
import { TeamMemberCard } from "@/components/TeamMemberCard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export default function Dashboard() {
  const { user, isAdmin, token } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  // Listen for real-time updates
  useEffect(() => {
    if (!socket || !user?.teamId) return;

    const invalidateQueued = (data: { teamId?: string }) => {
      if (data.teamId && data.teamId !== user.teamId) return;
      queryClient.invalidateQueries({ queryKey: ["queued"] });
    };

    const invalidateClaims = (data: { teamId?: string; userId?: string }) => {
      if (data.teamId && data.teamId !== user.teamId) return;
      // If it's a specific user update, and we're not that user (and not admin), ignore
      if (data.userId && data.userId !== user._id && !isAdmin) return;
      queryClient.invalidateQueries({ queryKey: ["claimed-numbers"] });
    };

    const invalidateMembers = (data: { teamId?: string }) => {
      // data might be the newUser object or just have teamId
      const teamId = (data as any).teamId;
      if (teamId && teamId !== user.teamId) return;
      queryClient.invalidateQueries({ queryKey: ["members"] });
    };

    socket.on("lines-queued-updated", invalidateQueued);
    socket.on("claimed-today-updated", invalidateClaims);
    socket.on("team-members-updated", invalidateMembers);
    socket.on("member-added", invalidateMembers);

    return () => {
      socket.off("lines-queued-updated", invalidateQueued);
      socket.off("claimed-today-updated", invalidateClaims);
      socket.off("team-members-updated", invalidateMembers);
      socket.off("member-added", invalidateMembers);
    };
  }, [socket, queryClient, user?.teamId, user?._id, isAdmin]);

  // Fetch team members
  const { data: teamMembers = [], isLoading: loadingMembers } = useQuery<User[]>({
    queryKey: ["members"],
    queryFn: () => apiFetch("/api/members", { token }),
    enabled: !!token,
    staleTime: 30000, // 30 seconds
  });

  // Fetch queued lines count
  const { data: queuedData, isLoading: loadingQueued } = useQuery({
    queryKey: ["queued"],
    queryFn: () => apiFetch("/api/queued", { token }),
    enabled: !!token,
    staleTime: 30000,
  });

  // Fetch claimed numbers count for today
  const { data: claimedNumbers = [], isLoading: loadingClaimed } = useQuery({
    queryKey: ["claimed-numbers"],
    queryFn: () => apiFetch("/api/claim/numbers", { token }),
    enabled: !!token && !isAdmin,
    staleTime: 30000,
  });

  const stats = useMemo(() => {
    const membersCount = teamMembers.length;
    const queuedCount = queuedData?.lines?.length || 0;

    let claimsToday = 0;
    if (isAdmin) {
      claimsToday = teamMembers.reduce((total, member) => total + (member.claimsToday || 0), 0);
    } else {
      claimsToday = Array.isArray(claimedNumbers) ? claimedNumbers.length : 0;
    }

    return [
      {
        label: "Team Members",
        value: membersCount.toString(),
        icon: Users,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
      },
      {
        label: "Lines Queued",
        value: queuedCount.toString(),
        icon: List,
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
      },
      {
        label: "Today's Claim",
        value: claimsToday.toString(),
        icon: TrendingUp,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
      },
    ];
  }, [teamMembers, queuedData, claimedNumbers, isAdmin]);

  const loading = loadingMembers || loadingQueued || (loadingClaimed && !isAdmin);

  const quickLinks = isAdmin
    ? [
        {
          title: "Numbers Sorter",
          description: "Add and deduplicate numbers",
          icon: BarChart3,
          path: "/sorter",
        },
        {
          title: "Queued List",
          description: "Manage queued numbers",
          icon: List,
          path: "/queued",
        },
        {
          title: "Team Management",
          description: "Manage team members",
          icon: Users,
          path: "/settings",
        },
      ]
    : [
        {
          title: "Numbers Inbox",
          description: "Claim your numbers",
          icon: Clock,
          path: "/inbox",
        },
        {
          title: "Team Chat",
          description: "Connect with your team",
          icon: Users,
          path: "/chat",
        },
        {
          title: "History",
          description: "View your claimed numbers",
          icon: TrendingUp,
          path: "/history",
        },
      ];

  return (
    <Layout>
      <div className="min-h-screen p-4 md:p-6 bg-transparent">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? "Manage your team and track your numbers"
                : "Check your inbox and collaborate with your team"}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={index}
                  className="border-border/50 hover:shadow-md transition-shadow"
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          {stat.label}
                        </span>
                        <div className={`${stat.bgColor} p-1.5 rounded-lg`}>
                          <Icon className={`h-3 w-3 ${stat.color}`} />
                        </div>
                      </div>
                      <p className="text-xl font-bold text-foreground">
                        {stat.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Links Section */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-3">
              Quick Links
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={index}
                    to={link.path}
                    target="_blank"
                    rel="noreferrer"
                    className="block h-full"
                  >
                    <Card className="h-full border-border/50 hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group">
                      <CardContent className="pt-4 pb-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5 flex-1">
                              <CardTitle className="text-base group-hover:text-primary transition-colors">
                                {link.title}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {link.description}
                              </CardDescription>
                            </div>
                            <Icon className="h-5 w-5 text-primary/60 group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
                          </div>
                          <div className="flex items-center gap-1 text-primary text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            Visit <ArrowRight className="h-3 w-3" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Team Members Section */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-3">
              Team Members
            </h2>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Loading team members...</p>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No team members yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamMembers.map((member, index) => (
                  <TeamMemberCard
                    key={member._id}
                    member={member}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
