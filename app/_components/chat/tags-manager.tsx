"use client";

import * as React from "react";
import { PlusIcon, XMarkIcon, CheckIcon, MagnifyingGlassIcon, TagIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
}

interface TagsManagerProps {
  activeTags: Tag[];
  onUpdateTags: (tagNames: string[]) => Promise<void>;
  isAuthenticated: boolean;
}

export function TagsManager({
  activeTags = [],
  onUpdateTags,
  isAuthenticated,
}: TagsManagerProps): React.ReactElement | null {
  const [open, setOpen] = React.useState(false);
  const [allTags, setAllTags] = React.useState<Tag[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [pos, setPos] = React.useState<{ left: number; top: number } | null>(null);

  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);

  const fetchAllTags = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        setAllTags(data.tags || []);
      }
    } catch (err) {
      console.error("Failed to fetch tags", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open && isAuthenticated) {
      void fetchAllTags();
    }
  }, [open, isAuthenticated, fetchAllTags]);

  // Position popover
  React.useEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Position below the button
      setPos({ left: Math.max(16, r.left), top: r.bottom + window.scrollY + 8 });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!isAuthenticated) return null;

  const filteredTags = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const isExactMatch = allTags.some(
    (t) => t.name.toLowerCase() === search.trim().toLowerCase()
  );

  async function handleToggleTag(tag: Tag) {
    const isActive = activeTags.some((t) => t.id === tag.id);
    let newNames: string[];
    if (isActive) {
      newNames = activeTags.filter((t) => t.id !== tag.id).map((t) => t.name);
    } else {
      newNames = [...activeTags.map((t) => t.name), tag.name];
    }
    await onUpdateTags(newNames);
  }

  async function handleCreateTag() {
    const trimmed = search.trim();
    if (!trimmed) return;
    if (isExactMatch) return;
    const newNames = [...activeTags.map((t) => t.name), trimmed];
    await onUpdateTags(newNames);
    setSearch("");
    void fetchAllTags(); // refresh lists
  }

  async function handleRemoveTag(e: React.MouseEvent, tag: Tag) {
    e.stopPropagation();
    const newNames = activeTags.filter((t) => t.id !== tag.id).map((t) => t.name);
    await onUpdateTags(newNames);
  }

  return (
    <div className="relative flex flex-wrap items-center gap-1.5 mt-1">
      {/* Active tags pills with remove icon */}
      {activeTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20 text-[11px] px-2 py-0.5 rounded-full font-medium"
        >
          <TagIcon className="h-3 w-3 shrink-0 text-violet-400" />
          <span>{tag.name}</span>
          <button
            type="button"
            onClick={(e) => handleRemoveTag(e, tag)}
            aria-label={`Hapus label ${tag.name}`}
            className="hover:bg-white/10 rounded-full p-0.5 transition"
          >
            <XMarkIcon className="h-3 w-3" />
          </button>
        </span>
      ))}

      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-full px-2 py-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-violet-500/40"
      >
        <PlusIcon className="h-3 w-3" />
        <span>Label</span>
      </button>

      {/* Popover */}
      {open && pos && (
        <div
          ref={popoverRef}
          className="fixed w-60 rounded-xl border border-white/[0.08] bg-card p-2 text-white shadow-xl z-50 flex flex-col gap-1.5"
          style={{
            left: pos.left,
            top: pos.top,
            animation: "userMenuIn 140ms cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          {/* Search Input */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari atau buat label..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder:text-muted outline-none focus:border-violet-500/40 focus:bg-white/[0.05]"
              autoFocus
            />
          </div>

          {/* Tags List */}
          <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5 custom-scrollbar">
            {loading ? (
              <span className="text-[11px] text-muted p-2 text-center">Memuat label...</span>
            ) : filteredTags.length === 0 ? (
              <span className="text-[11px] text-muted p-2 text-center">Tidak ada label ditemukan</span>
            ) : (
              filteredTags.map((tag) => {
                const isActive = activeTags.some((t) => t.id === tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition",
                      "hover:bg-white/[0.06] focus:outline-none focus:bg-white/[0.06]"
                    )}
                  >
                    <span className="truncate pr-2">{tag.name}</span>
                    {isActive && <CheckIcon className="h-3.5 w-3.5 text-violet-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Create Tag Option */}
          {search.trim().length > 0 && !isExactMatch && (
            <div className="border-t border-white/[0.06] pt-1.5 mt-0.5">
              <button
                type="button"
                onClick={handleCreateTag}
                className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-left text-xs text-violet-300 hover:bg-violet-500/10 transition outline-none"
              >
                <PlusIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Buat label "{search.trim()}"</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
