import { BookmarkIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ChatHeaderProps } from "./types";

export function ChatHeader({
  title,
  modelName,
  onPin,
  onMore,
  isSidebarOpen = true,
  onToggleSidebar,
}: ChatHeaderProps): React.ReactElement {
  return (
    <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5 pl-14 md:pl-5">
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden md:grid size-8 place-items-center rounded-md text-muted transition hover:bg-white/[0.06] hover:text-white"
            aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="size-5" />
            ) : (
              <PanelLeftOpen className="size-5" />
            )}
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold tracking-tight text-white">
            {title}
          </h1>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            <SparklesIcon className="h-3.5 w-3.5 text-violet-400" />
            <span>{modelName}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Pin chat"
          onClick={onPin}
          className="grid size-8 place-items-center rounded-md text-muted transition hover:bg-white/[0.06] hover:text-white"
        >
          <BookmarkIcon className="size-[18px]" />
        </button>
        <button
          type="button"
          aria-label="More options"
          onClick={onMore}
          className="grid size-8 place-items-center rounded-md text-muted transition hover:bg-white/[0.06] hover:text-white"
        >
          <EllipsisHorizontalIcon className="size-5" />
        </button>
      </div>
    </header>
  );
}
