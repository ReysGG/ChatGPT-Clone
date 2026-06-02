"use client";

import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import type { FeedbackValue } from "./types";

export interface ChatPanelProps {
  title: string;
  modelName: string;
  messages: import("./types").Message[];
  isLoading: boolean;
  isStreaming: boolean;
  promptSeed: number;
  copiedId: string | null;
  feedback: Record<string, FeedbackValue | null>;
  onCopy: (id: string, content: string) => void;
  onFeedback: (id: string, value: FeedbackValue) => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export function ChatPanel({
  title,
  modelName,
  messages,
  isLoading,
  isStreaming,
  promptSeed,
  copiedId,
  feedback,
  onCopy,
  onFeedback,
  isSidebarOpen,
  onToggleSidebar,
}: ChatPanelProps): React.ReactElement {
  return (
    <>
      <ChatHeader
        title={title}
        modelName={modelName}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
      />
      <div className="relative flex-1 overflow-y-auto px-4 py-6">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          isStreaming={isStreaming}
          promptSeed={promptSeed}
          copiedId={copiedId}
          feedback={feedback}
          onCopy={onCopy}
          onFeedback={onFeedback}
        />
      </div>
    </>
  );
}
