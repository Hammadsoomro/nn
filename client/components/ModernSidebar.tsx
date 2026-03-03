import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  Hash,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ModernSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export const ModernSidebar = ({
  isOpen,
  onOpenChange,
  isCollapsed,
  onCollapsedChange,
}: ModernSidebarProps) => {
  const { user, logout, isAdmin } = useAuth();
  const { unreadCounts } = useChat();
  const location = useLocation();

  const totalUnread = Array.from(unreadCounts.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Messaging Insights", icon: BarChart3, path: "/insights" },
    { label: "Bought Numbers", icon: Hash, path: "/history" },
    { label: "Buy Numbers", icon: ShoppingCart, path: "/sorter" },
    { label: "Team Management", icon: Users, path: "/settings" },
    { label: "Settings", icon: Settings, path: "/settings" },
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => onOpenChange(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-background border border-border rounded-lg"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 md:sticky md:top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transform flex flex-col transition-all duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 ${isCollapsed ? "w-20" : "w-72"}`}
      >
        {/* Header with Logo */}
        <div className="flex items-center px-6 h-20 flex-shrink-0">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-6 w-6 text-primary-foreground fill-current" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-lg text-sidebar-foreground truncate leading-tight">
                  Connectify
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                  SMS Platform
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label + item.path}
                to={item.path}
                onClick={() => onOpenChange(false)}
                className={`flex items-center rounded-xl transition-all ${
                  isActive(item.path)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                } ${isCollapsed ? "p-3 justify-center" : "px-4 py-3 gap-3"}`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Profile */}
        <div className="p-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center rounded-xl hover:bg-sidebar-accent/50 transition-all w-full ${
                  isCollapsed ? "p-2 justify-center" : "p-3 gap-3"
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-secondary-foreground flex-shrink-0">
                  {user?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase() || "HS"}
                </div>
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold truncate text-sidebar-foreground">
                      {user?.name || "Hammad Soomro"}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user?.role || "Admin"}
                    </p>
                  </div>
                )}
                {!isCollapsed && (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" side="right">
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />
      )}
    </>
  );
};
