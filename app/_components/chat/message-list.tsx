import { AssistantMessage } from "./assistant-message";
import { UserMessage } from "./user-message";
import { EmptyState } from "./empty-state";
import type {
  FeedbackValue,
  Message,
  MessageListProps,
} from "./types";

export function MessageList({
  messages,
  isStreaming,
  onCopy,
  copiedId,
  feedback,
  onFeedback,
}: MessageListProps): React.ReactElement {
  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul className="mx-auto flex max-w-3xl flex-col gap-6">
      {messages.map((m) =>
        m.role === "user" ? (
          <UserMessage key={m.id} message={m} />
        ) : (
          <AssistantMessage
            key={m.id}
            message={m}
            isStreaming={isStreaming}
            copiedId={copiedId}
            feedback={feedback[m.id] ?? null}
            onCopy={onCopy}
            onFeedback={onFeedback}
          />
        )
      )}
    </ul>
  );
}
