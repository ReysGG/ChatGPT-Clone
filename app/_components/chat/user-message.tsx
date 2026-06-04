import { memo } from "react";
import { PaperClipIcon, CheckIcon } from "@heroicons/react/24/outline";
import type { Message } from "./types";
import { formatClockTime } from "./format";

const USER_BUBBLE_STYLE = {
  background:
    "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #4f46e5 100%)",
} as const;

interface UserMessageProps {
  message: Message;
}

export const UserMessage = memo(function UserMessage({ message }: UserMessageProps): React.ReactElement {
  return (
    <li className="flex justify-end">
      <div className="max-w-[80%]">
        <div
          className="whitespace-pre-wrap rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed text-white shadow-lg shadow-violet-500/10"
          style={USER_BUBBLE_STYLE}
        >
          {message.content}
          {message.files && message.files.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs opacity-90">
              {message.files.map((f) => (
                <li key={f.id} className="flex items-center gap-1.5">
                  <PaperClipIcon className="size-3" /> {f.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[11px] text-muted">
          <span>{message.createdAt ?? formatClockTime()}</span>
          <span className="flex items-center text-violet-400">
            <CheckIcon className="size-3" />
            <CheckIcon className="-ml-1.5 size-3" />
          </span>
        </div>
      </div>
    </li>
  );
});

UserMessage.displayName = "UserMessage";
