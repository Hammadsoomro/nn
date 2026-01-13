import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { formatTime, formatDateOnly } from "@/lib/utils";
import {
  Home,
  MessageSquare,
  Settings,
  LogOut,
  List,
  Clock,
  BarChart3,
  X,
  Menu,
} from "lucide-react";

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
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalUnread = Array.from(unreadCounts.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { label: "Dashboard", icon: Home, path: "/dashboard" },
    { label: "Team Chat", icon: MessageSquare, path: "/chat" },
    { label: "Numbers Inbox", icon: Clock, path: "/inbox" },
    { label: "History", icon: Clock, path: "/history" },
    ...(isAdmin
      ? [
          { label: "Numbers Sorter", icon: BarChart3, path: "/sorter" },
          { label: "Queued List", icon: List, path: "/queued" },
        ]
      : []),
  ];

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => onOpenChange(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-sidebar hover:bg-sidebar-accent rounded-lg transition-all"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        data-collapsed={isCollapsed}
        className={`fixed inset-y-0 left-0 md:sticky md:top-0 z-40 h-screen md:h-auto bg-sidebar border-r border-sidebar-border transform flex flex-col overflow-hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
        style={{
          width: "18rem",
          transition: "width 0.3s ease-in-out",
        }}
      >
        <style>{`
          @media (min-width: 768px) {
            aside[data-collapsed="true"] {
              width: 6rem !important;
            }
            aside[data-collapsed="false"] {
              width: 20rem !important;
            }
          }
        `}</style>
        {/* Header with Logo */}
        <div
          className={`flex items-center px-4 h-20 border-b border-sidebar-border flex-shrink-0 transition-all duration-300 ${
            isCollapsed ? "justify-center" : "justify-start"
          }`}
        >
          {!isCollapsed && (
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 flex items-center justify-center group-hover:shadow-lg transition-all">
                <span className="text-sidebar-primary-foreground font-bold text-lg">
                  ◆
                </span>
              </div>
              <span className="font-bold text-lg text-sidebar-foreground">
                TaskFlow
              </span>
            </Link>
          )}
          {isCollapsed && (
            <Link
              to="/dashboard"
              className="flex justify-center items-center h-10 w-10 rounded-lg bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 group-hover:shadow-lg transition-all"
            >
              <span className="text-sidebar-primary-foreground font-bold text-lg">
                ◆
              </span>
            </Link>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* User Card */}
          {!isCollapsed && (
            <div className="p-4 m-4 rounded-lg bg-gradient-to-br from-sidebar-primary/10 to-sidebar-primary/5 border border-sidebar-border/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 flex items-center justify-center flex-shrink-0">
                  <span className="text-sidebar-primary-foreground font-bold text-sm">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>
              <div className="space-y-1 text-xs text-sidebar-foreground/70">
                <p className="font-mono font-semibold">
                  {formatTime(currentTime.toISOString())}
                </p>
                <p>{formatDateOnly(currentTime.toISOString())}</p>
              </div>
            </div>
          )}

          {/* Collapsed User Avatar */}
          {isCollapsed && (
            <div className="p-4 flex justify-center">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sidebar-primary to-sidebar-primary/70 flex items-center justify-center flex-shrink-0">
                <span className="text-sidebar-primary-foreground font-bold text-sm">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav
            className={`space-y-1 px-4 py-2 ${isCollapsed ? "flex flex-col items-center" : ""}`}
          >
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isTeamChat = item.path === "/chat";
              const hasUnread = isTeamChat && totalUnread > 0;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => onOpenChange(false)}
                  className={`flex items-center rounded-lg transition-all relative group ${
                    isActive(item.path)
                      ? "bg-gradient-to-r from-sidebar-primary/20 to-sidebar-primary/10 text-sidebar-primary font-semibold border border-sidebar-primary/30"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  } ${isCollapsed ? "p-3 justify-center w-10 h-10" : "px-4 py-3 gap-3"}`}
                  title={isCollapsed ? item.label : ""}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium whitespace-nowrap">
                      {item.label}
                    </span>
                  )}

                  {/* Unread Badge */}
                  {hasUnread && !isCollapsed && (
                    <span className="ml-auto text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </span>
                  )}
                  {hasUnread && isCollapsed && (
                    <div className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                  )}

                  {/* Collapsed Tooltip */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 bg-sidebar-accent text-sidebar-accent-foreground text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div
          className={`border-t border-sidebar-border p-4 space-y-2 flex-shrink-0 ${
            isCollapsed ? "flex flex-col items-center" : ""
          }`}
        >
          <Link
            to="/settings"
            className={`flex items-center rounded-lg transition-all relative group ${
              isActive("/settings")
                ? "bg-gradient-to-r from-sidebar-primary/20 to-sidebar-primary/10 text-sidebar-primary font-semibold border border-sidebar-primary/30"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            } ${isCollapsed ? "p-3 justify-center w-10 h-10" : "px-4 py-3 gap-3"}`}
            title={isCollapsed ? "Settings" : ""}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-sm font-medium">Settings</span>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-2 bg-sidebar-accent text-sidebar-accent-foreground text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                Settings
              </div>
            )}
          </Link>

          <button
            onClick={logout}
            className={`w-full flex items-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all relative group ${
              isCollapsed ? "p-3 justify-center" : "px-4 py-3 gap-3"
            }`}
            title={isCollapsed ? "Logout" : ""}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-sm font-medium">Logout</span>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-2 bg-sidebar-accent text-sidebar-accent-foreground text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                Logout
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}
    </>
  );
};
