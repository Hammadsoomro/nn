import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token, user } = useAuth();

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.close();
      }
      setSocket(null);
      setIsConnected(false);
      return;
    }

    // Create socket connection with authentication
    const newSocket = io(window.location.origin, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    newSocket.on("connect", () => {
      console.log("[Socket.IO] Connected:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("[Socket.IO] Disconnected:", reason);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("[Socket.IO] Connection error:", error);
    });

    newSocket.on("error", (error) => {
      console.error("[Socket.IO] Error:", error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token, user]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
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
