import { createContext, useContext, useState, useCallback } from "react";

interface ChatContextType {
  unreadCounts: Map<string, number>;
  setUnreadCount: (chatId: string, count: number) => void;
  incrementUnread: (chatId: string) => void;
  getTotalUnread: () => number;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(
    new Map(),
  );

  const setUnreadCount = useCallback((chatId: string, count: number) => {
    setUnreadCounts((prev) => {
      const updated = new Map(prev);
      if (count === 0) {
        updated.delete(chatId);
      } else {
        updated.set(chatId, count);
      }
      return updated;
    });
  }, []);

  const incrementUnread = useCallback((chatId: string) => {
    setUnreadCounts((prev) => {
      const updated = new Map(prev);
      const current = updated.get(chatId) || 0;
      updated.set(chatId, current + 1);
      return updated;
    });
  }, []);

  const getTotalUnread = useCallback(() => {
    let total = 0;
    unreadCounts.forEach((count) => {
      total += count;
    });
    return total;
  }, [unreadCounts]);

  return (
    <ChatContext.Provider
      value={{ unreadCounts, setUnreadCount, incrementUnread, getTotalUnread }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}
