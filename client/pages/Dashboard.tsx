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
  MessageSquare,
  TrendingUp,
  Phone,
  Users,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import type { User } from "@shared/api";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export default function Dashboard() {
  const { user, isAdmin, token } = useAuth();

  // Fetch team members
  const { data: teamMembers = [], isLoading: loadingMembers } = useQuery<User[]>({
    queryKey: ["members"],
    queryFn: () => apiFetch("/api/members", { token }),
    enabled: !!token,
    staleTime: 30000,
  });

  const stats = [
    {
      label: "Total Conversations",
      value: "0",
      description: "All time conversations",
      trend: "↑ 12% from last week",
      icon: MessageSquare,
      color: "text-rose-500",
      bgColor: "bg-rose-50",
    },
    {
      label: "Active Conversations",
      value: "0",
      description: "Ongoing chats",
      icon: TrendingUp,
      color: "text-rose-500",
      bgColor: "bg-rose-50",
    },
    {
      label: "Phone Numbers",
      value: "0",
      description: "Active numbers",
      icon: Phone,
      color: "text-rose-500",
      bgColor: "bg-rose-50",
    },
    {
      label: "Team Members",
      value: teamMembers.length.toString(),
      description: "Active users",
      icon: Users,
      color: "text-rose-500",
      bgColor: "bg-rose-50",
    },
  ];

  const quickActions = [
    {
      title: "View Conversations",
      description: "Manage your message threads",
      icon: MessageSquare,
      path: "/chat",
      iconColor: "text-rose-500",
      iconBg: "bg-rose-50",
    },
    {
      title: "Buy Phone Numbers",
      description: "Add new numbers to your account",
      icon: Phone,
      path: "/sorter",
      iconColor: "text-teal-500",
      iconBg: "bg-teal-50",
    },
    {
      title: "Manage Team",
      description: "Add or manage team members",
      icon: Users,
      path: "/settings",
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-50",
    },
  ];

  return (
    <Layout>
      <div className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your messaging platform.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="border-border/40 shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          {stat.label}
                        </p>
                        <p className="text-4xl font-extrabold text-foreground">
                          {stat.value}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground">
                          {stat.description}
                        </p>
                        {stat.trend && (
                          <p className="text-xs font-bold text-emerald-600">
                            {stat.trend}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`${stat.bgColor} p-3 rounded-xl`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <Card className="lg:col-span-2 border-border/40 shadow-sm min-h-[400px]">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-2xl font-bold">Recent Activity</CardTitle>
              <CardDescription className="text-sm">
                Latest messaging activity on your platform
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex flex-col items-center justify-center h-full space-y-4 opacity-60">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-bold text-foreground">No recent activity</p>
                <p className="text-sm text-muted-foreground">
                  Start conversations to see activity here
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="p-6 pb-2">
              <CardTitle className="text-2xl font-bold">Quick Actions</CardTitle>
              <CardDescription className="text-sm">
                Common tasks you can perform
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link key={index} to={action.path}>
                    <div className="group flex items-center p-4 rounded-xl bg-muted/40 hover:bg-muted/70 transition-all cursor-pointer border border-transparent hover:border-border/60 mb-3">
                      <div className={`${action.iconBg} p-3 rounded-xl mr-4 flex-shrink-0 transition-transform group-hover:scale-110`}>
                        <Icon className={`h-6 w-6 ${action.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-base leading-snug">
                          {action.title}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
