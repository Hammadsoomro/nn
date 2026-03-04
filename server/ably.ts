import * as Ably from "ably";

// Use the Root key on the server to allow publishing
const ABLY_ROOT_KEY = process.env.ABLY_API_KEY_ROOT;

let ablyInstance: Ably.Rest | null = null;

if (ABLY_ROOT_KEY) {
  ablyInstance = new Ably.Rest({ key: ABLY_ROOT_KEY });
  console.log("[Ably] Root instance initialized on server");
} else {
  console.warn("[Ably] ABLY_API_KEY_ROOT not found, real-time events will not be published");
}

/**
 * Publishes an event to an Ably channel.
 * This mimics the socket.io behavior but adapted for Ably.
 */
export async function publishEvent(channelName: string, eventName: string, data: any) {
  if (!ablyInstance) return;
  
  try {
    const channel = ablyInstance.channels.get(channelName);
    await channel.publish(eventName, data);
    console.log(`[Ably] Published ${eventName} to channel ${channelName}`);
  } catch (error) {
    console.error(`[Ably] Error publishing ${eventName} to channel ${channelName}:`, error);
  }
}

/**
 * Helper to maintain some compatibility with existing code during transition
 * Returns an object that has an 'emit' method for the global 'all' channel
 */
export function getIO() {
  return {
    emit: (eventName: string, data: any) => publishEvent("all", eventName, data),
    to: (channelName: string) => ({
      emit: (eventName: string, data: any) => publishEvent(channelName, eventName, data)
    })
  };
}
