"use client";

import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import type { FeedbackValue } from "./types";

export interface ChatPanelProps {
  title: string;
  modelName: string;
  messages: import("./types").Message[];
  isStreaming: boolean;
  copiedId: string | null;
  feedback: Record<string, FeedbackValue | null>;
  onCopy: (id: string, content: string) => void;
  onFeedback: (id: string, value: FeedbackValue) => void;
}

export function ChatPanel({
  title,
  modelName,
  messages,
  isStreaming,
  copiedId,
  feedback,
  onCopy,
  onFeedback,
}: ChatPanelProps): React.ReactElement {
  return (
    <>
      <ChatHeader title={title} modelName={modelName} />
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          copiedId={copiedId}
          feedback={feedback}
          onCopy={onCopy}
          onFeedback={onFeedback}
        />
      </div>
    </>
  );
}
