import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { ModernSidebar } from "@/components/ModernSidebar";
import { io, Socket } from "socket.io-client";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { token } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebarCollapsed") === "true";
    }
    return false;
  });
  const socketRef = useRef<Socket | null>(null);

  const toggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem("sidebarCollapsed", String(newValue));
  };

  // Initialize WebSocket for real-time features
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

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return (
    <div className="flex min-h-screen bg-background transition-all duration-300">
      {/* Modern Sidebar */}
      <ModernSidebar
        isOpen={sidebarOpen}
        onOpenChange={setSidebarOpen}
        isCollapsed={isCollapsed}
        onCollapsedChange={setIsCollapsed}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
