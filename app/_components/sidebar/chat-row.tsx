import { TrashIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";
import { ListItemPrefix, ListItemSuffix } from "./primitives";

interface ChatRowProps {
  active: boolean;
  title: string;
  relative: string;
  onClick: () => void;
  onDelete: () => void;
}

/**
 * Chat row uses `div role="button"` (not `<button>`) so the nested
 * delete `<button>` is valid HTML. Enter/Space activate the row,
 * matching native button keyboard behavior.
 */
export function ChatRow({
  active,
  title,
  relative,
  onClick,
  onDelete,
}: ChatRowProps): React.ReactElement {
  const state = active
    ? "bg-violet-500/15 ring-1 ring-violet-500/30 text-white"
    : "text-white/85 hover:bg-white/[0.04] focus:bg-white/[0.04]";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition outline-none select-none focus-visible:ring-2 focus-visible:ring-violet-500/40",
        state
      )}
    >
      <ListItemPrefix>
        <ChatBubbleLeftRightIcon
          className={cn(
            "h-4 w-4",
            active ? "text-violet-300" : "text-muted"
          )}
        />
      </ListItemPrefix>
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <ListItemSuffix>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-muted">{relative}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label={`Delete chat ${title}`}
            className="rounded p-1 text-muted opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100 focus:opacity-100"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </ListItemSuffix>
    </div>
  );
}
