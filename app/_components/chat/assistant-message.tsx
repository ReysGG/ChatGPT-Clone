import { memo } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { CopyButton } from "./copy-button";
import { FeedbackButton } from "./feedback-button";
import { MarkdownContent } from "./markdown-content";
import type { FeedbackValue, Message } from "./types";
import { formatClockTime } from "./format";

interface AssistantMessageProps {
  message: Message;
  isStreaming: boolean;
  copiedId: string | null;
  feedback: FeedbackValue | null;
  onCopy: (id: string, content: string) => void;
  onFeedback: (id: string, value: FeedbackValue) => void;
}

export const AssistantMessage = memo(function AssistantMessage({
  message,
  isStreaming,
  copiedId,
  feedback,
  onCopy,
  onFeedback,
}: AssistantMessageProps): React.ReactElement {
  return (
    <li className="flex gap-3">
      <div
        className="grid size-8 shrink-0 place-items-center rounded-full text-primary bg-primary/10 border border-primary/20"
        aria-hidden
      >
        <SparklesIcon className="size-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
          {message.content ? <MarkdownContent content={message.content} /> : isStreaming ? "…" : ""}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
          <span>{message.createdAt ?? formatClockTime()}</span>
          <span className="text-border">·</span>
          <CopyButton
            copied={copiedId === message.id}
            onClick={() => onCopy(message.id, message.content)}
          />
          <FeedbackButton
            active={feedback === "up"}
            kind="up"
            label="Good response"
            onClick={() => onFeedback(message.id, "up")}
          />
          <FeedbackButton
            active={feedback === "down"}
            kind="down"
            label="Bad response"
            onClick={() => onFeedback(message.id, "down")}
          />
        </div>
      </div>
    </li>
  );
});

AssistantMessage.displayName = "AssistantMessage";
