export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type?: string;
}

export interface ChatInputProps {
  onSend: (message: string, files: UploadedFile[]) => void;
  isStreaming?: boolean;
  isEmpty?: boolean;
  onStop?: () => void;
}
