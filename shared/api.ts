/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

export interface DemoResponse {
  message: string;
}

export type UserRole = "admin" | "member";

export interface User {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  profilePicture?: string;
  profilePictureUrl?: string;
  createdBy?: string;
  teamId: string;
  createdAt: string;
  updatedAt: string;
  totalClaims?: number;
  claimsToday?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface CreateMemberRequest {
  email: string;
  password: string;
  name: string;
}

export interface QueuedLine {
  _id: string;
  content: string;
  addedBy: string;
  addedAt: string;
  teamId: string;
}

export interface ClaimedLine extends QueuedLine {
  claimedBy: string;
  claimedAt: string;
}

export interface HistoryEntry {
  _id: string;
  content: string;
  claimedBy: string;
  claimedAt: string;
  teamId: string;
}

export interface ClaimSettings {
  lineCount: number;
  cooldownMinutes: number;
  teamId: string;
}

export interface ChatMessage {
  _id: string;
  sender: string;
  senderName: string;
  senderPicture?: string;
  recipient?: string;
  groupId?: string;
  content: string;
  createdAt: string;
  editedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
  readBy?: string[];
}

export interface ChatGroup {
  _id: string;
  name: string;
  members: string[];
  teamId: string;
  createdAt: string;
}
