import { Layout } from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart3,
  Clock,
  Users,
  List,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import type { User } from "@shared/api";
import { TeamMemberCard } from "@/components/TeamMemberCard";
import { io, Socket } from "socket.io-client";

export default function Dashboard() {
  const { user, isAdmin, token } = useAuth();
  const [stats, setStats] = useState([
    {
      label: "Team Members",
      value: "0",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Lines Queued",
      value: "0",
      icon: List,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Today's Claim",
      value: "0",
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Fetch real-time stats and team members with WebSocket support
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setError(null);
      try {
        // Fetch team members
        try {
          const membersResponse = await fetch("/api/members", {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (membersResponse.ok) {
            const members = await membersResponse.json();
            setTeamMembers(members);

            // Update team members count in stats
            setStats((prev) =>
              prev.map((stat) =>
                stat.label === "Team Members"
                  ? { ...stat, value: members.length.toString() }
                  : stat,
              ),
            );
          } else {
            const errorText = await membersResponse.text();
            console.warn(
              "Members fetch error:",
              membersResponse.status,
              errorText,
            );
          }
        } catch (err) {
          console.error("Members fetch failed:", err);
        }

        // Fetch queued lines count
        try {
          const queuedResponse = await fetch("/api/queued", {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (queuedResponse.ok) {
            const data = await queuedResponse.json();
            const count = data.lines ? data.lines.length : 0;

            setStats((prev) =>
              prev.map((stat) =>
                stat.label === "Lines Queued"
                  ? { ...stat, value: count.toString() }
                  : stat,
              ),
            );
          } else {
            const errorText = await queuedResponse.text();
            console.error(
              "Queued fetch error:",
              queuedResponse.status,
              errorText,
            );
          }
        } catch (err) {
          console.error("Queued fetch failed:", err);
        }

        // Fetch claimed numbers count for today
        try {
          if (isAdmin) {
            // For admins: Calculate total claims from all team members today
            const claimsToday = teamMembers.reduce((total, member) => {
              return total + (member.claimsToday || 0);
            }, 0);

            setStats((prev) =>
              prev.map((stat) =>
                stat.label === "Today's Claim"
                  ? { ...stat, value: claimsToday.toString() }
                  : stat,
              ),
            );
          } else {
            // For team members: Show their own claims
            const claimedResponse = await fetch("/api/claim/numbers", {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (claimedResponse.ok) {
              const claimedNumbers = await claimedResponse.json();
              const count = Array.isArray(claimedNumbers)
                ? claimedNumbers.length
                : 0;

              setStats((prev) =>
                prev.map((stat) =>
                  stat.label === "Today's Claim"
                    ? { ...stat, value: count.toString() }
                    : stat,
                ),
              );
            } else {
              const errorText = await claimedResponse.text();
              console.error(
                "Claimed fetch error:",
                claimedResponse.status,
                errorText,
              );
            }
          }
        } catch (err) {
          console.error("Claimed fetch failed:", err);
        }
      } catch (error) {
        console.error("Error in fetchData:", error);
        setError("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up WebSocket connection for real-time updates
    if (!socketRef.current && token) {
      socketRef.current = io(window.location.origin, {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      // Listen for member updates
      socketRef.current.on("member-added", (newMember: User) => {
        console.log("[Dashboard] New member added:", newMember.name);
        setTeamMembers((prev) => [...prev, newMember]);

        // Update team members count in stats
        setStats((prev) =>
          prev.map((stat) =>
            stat.label === "Team Members"
              ? { ...stat, value: (parseInt(stat.value) + 1).toString() }
              : stat,
          ),
        );
      });

      socketRef.current.on("member-updated", (updatedMember: User) => {
        console.log("[Dashboard] Member updated:", updatedMember.name);
        setTeamMembers((prev) =>
          prev.map((m) => (m._id === updatedMember._id ? updatedMember : m)),
        );
      });

      socketRef.current.on("member-removed", (memberId: string) => {
        console.log("[Dashboard] Member removed:", memberId);
        setTeamMembers((prev) => prev.filter((m) => m._id !== memberId));

        // Update team members count in stats
        setStats((prev) =>
          prev.map((stat) =>
            stat.label === "Team Members"
              ? {
                  ...stat,
                  value: Math.max(0, parseInt(stat.value) - 1).toString(),
                }
              : stat,
          ),
        );
      });

      // Listen for queued lines updates
      socketRef.current.on(
        "lines-queued-updated",
        (data: { count: number }) => {
          console.log("[Dashboard] Lines queued updated:", data.count);
          setStats((prev) =>
            prev.map((stat) =>
              stat.label === "Lines Queued"
                ? { ...stat, value: data.count.toString() }
                : stat,
            ),
          );
        },
      );

      // Listen for claimed today updates
      socketRef.current.on(
        "claimed-today-updated",
        (data: { count: number }) => {
          console.log("[Dashboard] Claimed today updated:", data.count);
          setStats((prev) =>
            prev.map((stat) =>
              stat.label === "Claimed Today"
                ? { ...stat, value: data.count.toString() }
                : stat,
            ),
          );
        },
      );
    }

    // Set up polling for fallback real-time updates (every 30 seconds)
    const interval = setInterval(fetchData, 30000);

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.off("member-added");
        socketRef.current.off("member-updated");
        socketRef.current.off("member-removed");
        socketRef.current.off("lines-queued-updated");
        socketRef.current.off("claimed-today-updated");
      }
    };
  }, [token]);

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

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive"
            >
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

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
                  <Link key={index} to={link.path}>
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
