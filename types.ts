
export interface ProcessedResult {
  imageUrl: string;
  prompt: string;
}

export interface UploadedFile {
  file?: File; // File object is optional for history restoration
  previewUrl: string;
  base64: string;
  mimeType: string;
}

export interface ProcessedHistoryItem {
  id: string;
  timestamp: number;
  originalImage: UploadedFile;
  resultImage: string;
  prompt: string;
  resolution: Resolution;
  sizeBytes: number; // Size of this record
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type Resolution = '480p' | '720p' | '1040p' | '1240p' | '1440p' | '2K' | '4K' | '8K';

export type VipLevel = 'NONE' | 'VIP' | 'SSVIP' | 'ULTRA_INFINITY' | 'LIFETIME' | 'MODERATOR';

export type AppView = 'HOME' | 'PROFILE' | 'DRAW' | 'HISTORY' | 'ADMIN' | 'AUTO_PAINT' | 'ADMIN_CHAT' | 'PUBLIC_CHAT';

export type AccountStatus = 'ACTIVE' | 'LIMITED' | 'LOCKED' | 'BANNED';

export interface Frame {
  id: string;
  name: string;
  type: 'DEFAULT' | 'VIP_UNLOCK' | 'STAR_BUY' | 'AD_WATCH';
  cssClass: string;
  cost?: number; // Cost in stars if type is STAR_BUY
  requiredVip?: VipLevel; // If type is VIP_UNLOCK
  description: string;
}

export interface UserProfile {
  avatarUrl: string | null;
  currentFrameId: string;
  ownedFrameIds: string[];
}

export interface User {
  username: string;
  password?: string; // stored plainly for this demo (in production use hash)
  credits: number;
  vipLevel: VipLevel;
  profile: UserProfile;
  lastLogin: string;
  status: AccountStatus;
  cheatStrikes: number; // 0-5
  ipAddress?: string; // Simulated IP for banning
  secretCode?: string; // Code used to reset password
  totalRecharged: number; // Total money spent in VND
  vipExpiry?: number; // Timestamp for VIP expiration. If undefined/null, implies permanent or none.
  dailyChatCount?: number; // Number of messages sent today
  lastChatTimestamp?: number; // Timestamp of last sent message
}

export interface ChatMessage {
  id: string;
  sender: 'USER' | 'ADMIN';
  text: string;
  timestamp: number;
}

export interface PublicChatMessage {
  id: string;
  username: string;
  vipLevel: VipLevel;
  avatarUrl: string | null;
  frameId: string;
  text: string;
  timestamp: number;
  isAdmin?: boolean;
}
