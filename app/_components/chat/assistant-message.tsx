import { SparklesIcon } from "@heroicons/react/24/outline";
import { CopyButton } from "./copy-button";
import { FeedbackButton } from "./feedback-button";
import type { FeedbackValue, Message } from "./types";
import { formatClockTime } from "./format";

const ASSISTANT_AVATAR_STYLE = {
  background:
    "linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(79, 70, 229, 0.15) 100%)",
} as const;

interface AssistantMessageProps {
  message: Message;
  isStreaming: boolean;
  copiedId: string | null;
  feedback: FeedbackValue | null;
  onCopy: (id: string, content: string) => void;
  onFeedback: (id: string, value: FeedbackValue) => void;
}

export function AssistantMessage({
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
        className="grid size-8 shrink-0 place-items-center rounded-full text-violet-200 ring-1 ring-violet-500/20"
        style={ASSISTANT_AVATAR_STYLE}
        aria-hidden
      >
        <SparklesIcon className="size-4 text-violet-300" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="whitespace-pre-wrap rounded-2xl rounded-tl-md border border-white/[0.06] bg-card px-4 py-2.5 text-sm leading-relaxed text-white">
          {message.content || (isStreaming ? "…" : "")}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
          <span>{message.createdAt ?? formatClockTime()}</span>
          <span className="text-white/15">·</span>
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
}
