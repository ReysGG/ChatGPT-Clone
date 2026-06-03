import type { UploadedFile } from "../chat-input/types";

export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  files?: UploadedFile[];
  createdAt?: string;
}

export type FeedbackValue = "up" | "down";

export interface ChatHeaderProps {
  title: string;
  modelName: string;
  activeTags?: Array<{ id: string; name: string }>;
  onUpdateTags?: (tagNames: string[]) => Promise<void>;
  onPin?: () => void;
  onMore?: () => void;
  sessionRole?: "guest" | "user" | "admin";
  isAuthenticated?: boolean;
  onLoginClick?: () => void;
  onLogout?: () => void;
  isShareable?: boolean;
  isShared?: boolean;
  shareStatus?: "idle" | "sharing" | "copied";
  onShare?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  promptSeed: number;
  copiedId: string | null;
  feedback: Record<string, FeedbackValue | null>;
  onCopy: (id: string, content: string) => void;
  onFeedback: (id: string, value: FeedbackValue) => void;
}
