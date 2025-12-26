import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useTheme } from "@/context/ThemeContext";
import { useSocket } from "@/context/SocketContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Settings,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ThemeSelector } from "@/components/ThemeSelector";
import { ModernSidebar } from "@/components/ModernSidebar";
import { AnnouncementSlider } from "@/components/AnnouncementSlider";
import { io, Socket } from "socket.io-client";

interface Announcement {
  _id: string;
  text: string;
  sentBy: string;
  teamId: string;
  createdAt: string;
}

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebarCollapsed") === "true";
    }
    return false;
  });
  const [currentAnnouncement, setCurrentAnnouncement] =
    useState<Announcement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const toggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem("sidebarCollapsed", String(newValue));
  };

  // Initialize WebSocket for announcements
  useEffect(() => {
    if (!token) return;

    const socket = io(window.location.origin, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    // Listen for announcements
    const handleAnnouncementReceived = (data: Announcement) => {
      console.log("[Layout] Announcement received:", data);
      setCurrentAnnouncement(data);
    };

    socket.on("announcement-received", handleAnnouncementReceived);

    return () => {
      socket.off("announcement-received", handleAnnouncementReceived);
      socket.disconnect();
    };
  }, [token]);

  return (
    <>
      {/* Announcement Slider */}
      {currentAnnouncement && (
        <AnnouncementSlider
          announcement={currentAnnouncement}
          onDismiss={() => setCurrentAnnouncement(null)}
        />
      )}

      <div
        className={`flex h-screen bg-transparent transition-all duration-300 ${currentAnnouncement ? "pt-20" : ""}`}
      >
        {/* Modern Sidebar */}
        <ModernSidebar
          isOpen={sidebarOpen}
          onOpenChange={setSidebarOpen}
          isCollapsed={isCollapsed}
          onCollapsedChange={setIsCollapsed}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Navbar */}
          <nav className="sticky top-0 z-30 h-16 border-b border-border bg-card/80 backdrop-blur-sm">
            <div className="px-4 md:px-6 h-full flex items-center justify-between">
              {/* Left - Collapse Button */}
              <button
                onClick={toggleCollapse}
                className="hidden md:inline-flex p-2 hover:bg-secondary rounded-lg transition-colors"
                title={isCollapsed ? "Expand" : "Collapse"}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </button>

              {/* Right */}
              <div className="flex items-center gap-3">
                {/* Theme Selector */}
                <ThemeSelector />

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                  aria-label="Toggle light/dark theme"
                >
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <Moon className="h-5 w-5 text-slate-400" />
                  )}
                </button>

                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary transition-colors">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                        {user?.name?.[0]?.toUpperCase() || "U"}
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:inline" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-4 py-2 text-sm">
                      <p className="font-semibold text-foreground">
                        {user?.name}
                      </p>
                      <p className="text-muted-foreground">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
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
            </div>
          </nav>

          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-gradient-to-b from-transparent to-transparent">
            {children}
          </main>
        </div>
      </div>
    </>
  );
};
