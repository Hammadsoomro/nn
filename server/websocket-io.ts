// Global WebSocket instance manager
// This allows routes and other modules to emit real-time events

import { Server as SocketIOServer } from "socket.io";

let ioInstance: SocketIOServer | null = null;

export function setIO(io: SocketIOServer) {
  ioInstance = io;
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

export function isIOInitialized(): boolean {
  return ioInstance !== null;
}
