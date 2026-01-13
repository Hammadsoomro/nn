// Real-time messaging state management using in-memory store
// This can be upgraded to WebSocket (ws or socket.io) for production

interface TypingIndicator {
  userId: string;
  senderName: string;
  chatId: string; // groupId or recipient
  chatType: "group" | "direct";
  timestamp: number;
}

const typingIndicators = new Map<string, TypingIndicator>();

// Clean up typing indicators after 3 seconds of inactivity
setInterval(() => {
  const now = Date.now();
  for (const [key, indicator] of typingIndicators.entries()) {
    if (now - indicator.timestamp > 3000) {
      typingIndicators.delete(key);
    }
  }
}, 1000);

export function setTypingIndicator(indicator: TypingIndicator) {
  typingIndicators.set(`${indicator.userId}-${indicator.chatId}`, indicator);
}

export function getTypingIndicators(chatId: string): TypingIndicator[] {
  const indicators: TypingIndicator[] = [];
  typingIndicators.forEach((indicator) => {
    if (
      indicator.chatId === chatId &&
      Date.now() - indicator.timestamp < 3000
    ) {
      indicators.push(indicator);
    }
  });
  return indicators;
}

export function clearTypingIndicator(userId: string, chatId: string) {
  typingIndicators.delete(`${userId}-${chatId}`);
}
