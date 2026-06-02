import { AssistantMessage } from "./assistant-message";
import { UserMessage } from "./user-message";
import { EmptyState } from "./empty-state";
import { TypingIndicator } from "./typing-indicator";
import { AutoScroll } from "./auto-scroll";
import type {
  FeedbackValue,
  Message,
  MessageListProps,
} from "./types";

export function MessageList({
  messages,
  isLoading,
  isStreaming,
  promptSeed,
  onCopy,
  copiedId,
  feedback,
  onFeedback,
}: MessageListProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-3 pt-8" aria-label="Loading conversations">
        <div className="h-16 w-2/3 animate-pulse rounded-2xl bg-white/[0.06]" />
        <div className="ml-auto h-12 w-1/2 animate-pulse rounded-2xl bg-violet-500/10" />
        <div className="h-24 w-3/4 animate-pulse rounded-2xl bg-white/[0.06]" />
      </div>
    );
  }

  if (messages.length === 0 && !isStreaming) {
    return <EmptyState promptSeed={promptSeed} />;
  }

  return (
    <ul className="mx-auto flex max-w-3xl flex-col gap-6">
      {messages.map((m) =>
        m.role === "user" ? (
          <UserMessage key={m.id} message={m} />
        ) : m.content.trim().length > 0 ? (
          <AssistantMessage
            key={m.id}
            message={m}
            isStreaming={isStreaming}
            copiedId={copiedId}
            feedback={feedback[m.id] ?? null}
            onCopy={onCopy}
            onFeedback={onFeedback}
          />
        ) : null
      )}
      {isStreaming && <TypingIndicator />}
      <AutoScroll messages={messages} isStreaming={isStreaming} />
    </ul>
  );
}
