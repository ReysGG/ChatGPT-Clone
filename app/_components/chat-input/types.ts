import type { AuthSession } from "../../_hooks/use-chat-state";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type?: string;
}

export interface ChatInputProps {
  onSend: (message: string, files: UploadedFile[], webSearch?: boolean) => void;
  isStreaming?: boolean;
  isEmpty?: boolean;
  onStop?: () => void;
  session: AuthSession;
  onLoginClick: () => void;
}
