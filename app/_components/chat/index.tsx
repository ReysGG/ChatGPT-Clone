"use client";

import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { ImageProgress, type ImageGenStage } from "./image-progress";
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
  activeTags?: Array<{ id: string; name: string }>;
  onUpdateTags?: (tagNames: string[]) => Promise<void>;
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
  isGeneratingImage?: boolean;
  imageGenProgress?: { stage: ImageGenStage; message: string } | null;
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
  activeTags,
  onUpdateTags,
  onMore,
  sessionRole,
  isAuthenticated,
  onLoginClick,
  onLogout,
  isShareable,
  isShared,
  shareStatus,
  onShare,
  isSidebarOpen,
  onToggleSidebar,
  isGeneratingImage,
  imageGenProgress,
}: ChatPanelProps): React.ReactElement {
  return (
    <>
      <ChatHeader
        title={title}
        modelName={modelName}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar}
        activeTags={activeTags}
        onUpdateTags={onUpdateTags}
        onMore={onMore}
        sessionRole={sessionRole}
        isAuthenticated={isAuthenticated}
        onLoginClick={onLoginClick}
        onLogout={onLogout}
        isShareable={isShareable}
        isShared={isShared}
        shareStatus={shareStatus}
        onShare={onShare}
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
        {/* Image generation progress indicator */}
        {isGeneratingImage && imageGenProgress && (
          <div className="mx-auto mt-4 max-w-3xl">
            <div className="flex gap-3">
              <div className="size-8 shrink-0" />{/* Spacer to align with messages */}
              <div className="min-w-0 flex-1">
                <ImageProgress
                  stage={imageGenProgress.stage}
                  message={imageGenProgress.message}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
