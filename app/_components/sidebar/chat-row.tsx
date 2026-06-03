"use client";

import { useState, useEffect } from "react";
import { TrashIcon, ChatBubbleLeftRightIcon, PencilIcon } from "@heroicons/react/24/solid";
import { GlobeAltIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { ListItemPrefix, ListItemSuffix } from "./primitives";

interface ChatRowProps {
  active: boolean;
  title: string;
  relative: string;
  isShared?: boolean;
  tags?: Array<{ id: string; name: string }>;
  onClick: () => void;
  onDelete: () => void;
  onRename?: (newTitle: string) => void;
}

export function ChatRow({
  active,
  title,
  relative,
  isShared = false,
  tags = [],
  onClick,
  onDelete,
  onRename,
}: ChatRowProps): React.ReactElement {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>(title);

  useEffect(() => {
    setEditTitle(title);
  }, [title]);

  const state = active
    ? "bg-violet-500/15 ring-1 ring-violet-500/30 text-white"
    : "text-white/85 hover:bg-white/[0.04] focus:bg-white/[0.04]";

  function handleSave() {
    setIsEditing(false);
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== title && onRename) {
      onRename(trimmed);
    } else {
      setEditTitle(title);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={isEditing ? undefined : onClick}
      onDoubleClick={() => {
        if (onRename) {
          setIsEditing(true);
        }
      }}
      onKeyDown={(e) => {
        if (!isEditing && (e.key === "Enter" || e.key === " ")) {
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
            "h-4 w-4 shrink-0",
            active ? "text-violet-300" : "text-muted"
          )}
        />
      </ListItemPrefix>

      {isEditing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSave();
            } else if (e.key === "Escape") {
              setIsEditing(false);
              setEditTitle(title);
            }
          }}
          className="min-w-0 flex-1 bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-sm text-white outline-none focus:border-violet-500"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="min-w-0 flex-1 flex flex-col items-start gap-0.5">
          <span className="w-full truncate">{title}</span>
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5 max-w-full">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-block bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20 text-[10px] px-1 py-0.2 rounded font-medium truncate max-w-[80px]"
                  title={tag.name}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <ListItemSuffix>
        <div className="flex items-center gap-1.5 shrink-0">
          {isShared && (
            <GlobeAltIcon
              className="h-3.5 w-3.5 text-emerald-400 shrink-0"
              title="Shared conversation"
            />
          )}
          
          {!isEditing && (
            <span className="text-[11px] text-muted group-hover:hidden transition-all duration-75">
              {relative}
            </span>
          )}

          {!isEditing && (
            <div className="hidden group-hover:flex items-center gap-1">
              {onRename && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  aria-label={`Rename chat ${title}`}
                  title="Rename chat"
                  className="rounded p-1 text-muted transition hover:bg-white/10 hover:text-white"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
              )}
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                aria-label={`Delete chat ${title}`}
                title="Delete chat"
                className="rounded p-1 text-muted transition hover:bg-white/10 hover:text-white"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </ListItemSuffix>
    </div>
  );
}
