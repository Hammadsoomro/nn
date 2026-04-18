import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from "react";
import * as Ably from "ably";
import { useAuth } from "./AuthContext";

interface SocketContextType {
  socket: any; // Using any to maintain compatibility with existing 'socket.on' usage
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const { token, user } = useAuth();
  const ablyRef = useRef<Ably.Realtime | null>(null);
  
  // Use a ref to store handlers to avoid re-renders and closure issues
  const handlersRef = useRef<Record<string, Set<(data: any) => void>>>({});

  // Dispatch message to local handlers
  const dispatchMessage = useCallback((message: Ably.InboundMessage) => {
    const handlers = handlersRef.current[message.name];
    if (handlers) {
      console.log(`[Ably] Dispatching message: ${message.name}`, message.data);
      handlers.forEach(handler => handler(message.data));
    }
  }, []);

  useEffect(() => {
    if (!token || !user) {
      if (ablyRef.current) {
        ablyRef.current.close();
        ablyRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const ABLY_KEY = import.meta.env.VITE_ABLY_API_KEY_SUBSCRIBE;

    if (!ABLY_KEY) {
      console.warn("[Ably] VITE_ABLY_API_KEY_SUBSCRIBE not configured - real-time features disabled");
      // Mark as connected anyway so UI doesn't wait indefinitely
      setIsConnected(true);
      return;
    }

    console.log("[Ably] Initializing Realtime connection...");

    try {
      // Initialize Ably Realtime
      const ably = new Ably.Realtime({
        key: ABLY_KEY,
        clientId: user._id,
        autoConnect: true,
      });

      ablyRef.current = ably;

      ably.connection.on("connected", () => {
        console.log("[Ably] Connected to real-time service");
        setIsConnected(true);
      });

      ably.connection.on("disconnected", () => {
        console.log("[Ably] Disconnected from real-time service");
        setIsConnected(false);
      });

      ably.connection.on("failed", (err) => {
        console.error("[Ably] Connection failed:", err);
        // Mark as connected anyway to prevent UI hang
        setIsConnected(true);
      });

      // Subscribe to common channels
      const globalChannel = ably.channels.get("all");
      globalChannel.subscribe(dispatchMessage);

      if (user.teamId) {
        const teamChannel = ably.channels.get(user.teamId);
        teamChannel.subscribe(dispatchMessage);

        // Also subscribe to user-specific channel
        const userChannel = ably.channels.get(`user:${user._id}`);
        userChannel.subscribe(dispatchMessage);
      }
    } catch (error) {
      console.error("[Ably] Failed to initialize:", error);
      // Mark as connected to allow UI to continue
      setIsConnected(true);
    }

    return () => {
      if (ablyRef.current) {
        ablyRef.current.close();
        ablyRef.current = null;
      }
    };
  }, [token, user?._id, user?.teamId, dispatchMessage]);

  // Mock socket object that implements on/off
  const mockSocket = useRef({
    on: (event: string, callback: (data: any) => void) => {
      if (!handlersRef.current[event]) {
        handlersRef.current[event] = new Set();
      }
      handlersRef.current[event].add(callback);
    },
    off: (event: string, callback: (data: any) => void) => {
      const handlers = handlersRef.current[event];
      if (handlers) {
        handlers.delete(callback);
      }
    },
    emit: (event: string, data: any) => {
      console.warn(`[Ably] Client-side emit ignored for event: ${event}. Use API instead.`);
    }
  }).current;

  return (
    <SocketContext.Provider value={{ socket: mockSocket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};
