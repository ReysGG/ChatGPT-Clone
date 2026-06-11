import { BookmarkIcon, EllipsisHorizontalIcon, ShareIcon } from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { ChatHeaderProps } from "./types";
import { TagsManager } from "./tags-manager";

export function ChatHeader({
  title,
  modelName,
  activeTags = [],
  onUpdateTags,
  onPin,
  onMore,
  sessionRole = "guest",
  isAuthenticated = false,
  onLoginClick,
  onLogout,
  isShareable = false,
  isShared = false,
  shareStatus = "idle",
  onShare,
  isSidebarOpen = true,
  onToggleSidebar,
}: ChatHeaderProps): React.ReactElement {
  const shareLabel = shareStatus === "copied"
    ? "Link copied"
    : isShared
      ? "Copy shared link"
      : "Share chat";

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 pl-14 md:pl-5">
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden md:grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted/15 hover:text-foreground"
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
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {isShared && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20 shrink-0">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Shared
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <div className="flex items-center gap-1.5">
              <SparklesIcon className="h-3.5 w-3.5 text-primary" />
              <span>{modelName}</span>
            </div>
            {isAuthenticated && onUpdateTags && (
              <TagsManager
                activeTags={activeTags}
                onUpdateTags={onUpdateTags}
                isAuthenticated={isAuthenticated}
              />
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden rounded-full border border-border px-2.5 py-1 text-xs capitalize text-muted-foreground sm:inline-flex">
          {sessionRole}
        </span>
        {isAuthenticated ? (
          <button
            type="button"
            onClick={onLogout}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted/15"
          >
            Logout
          </button>
        ) : (
          <button
            type="button"
            onClick={onLoginClick}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/95"
          >
            Login
          </button>
        )}
        <button
          type="button"
          aria-label={shareLabel}
          title={shareLabel}
          onClick={onShare}
          disabled={!isShareable || shareStatus === "sharing"}
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted/15 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShareIcon className="size-[18px]" />
        </button>
        <button
          type="button"
          aria-label="Pin chat"
          title="Pin chat"
          onClick={onPin}
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted/15 hover:text-foreground"
        >
          <BookmarkIcon className="size-[18px]" />
        </button>
        <button
          type="button"
          aria-label="More options"
          title="More options"
          onClick={onMore}
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition hover:bg-muted/15 hover:text-foreground"
        >
          <EllipsisHorizontalIcon className="size-5" />
        </button>
      </div>
    </header>
  );
}
