"use client";

import { useEffect, useId, useRef } from "react";
import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { ChatItem } from "./types";

interface DeleteChatDialogProps {
  chat: ChatItem | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteChatDialog({
  chat,
  open,
  onClose,
  onConfirm,
}: DeleteChatDialogProps): React.ReactElement | null {
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousActive = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => cancelButtonRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousActive?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !chat) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6" role="presentation">
      <button
        type="button"
        aria-label="Close delete confirmation"
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#171717] text-white shadow-2xl shadow-black/40"
      >
        <div className="flex items-start gap-4 p-5">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-red-500/10 ring-1 ring-red-500/25">
            <ExclamationTriangleIcon className="size-5 text-red-300" aria-hidden />
          </div>

          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold text-white">
              Hapus chat ini?
            </h2>
            <p id={descriptionId} className="mt-1 text-sm leading-6 text-zinc-400">
              Percakapan “<span className="text-zinc-200">{chat.title}</span>” akan dihapus permanen beserta semua pesan di dalamnya.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            aria-label="Close"
          >
            <XMarkIcon className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 px-4 text-sm font-medium text-zinc-200 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-red-500 px-4 text-sm font-semibold text-white transition hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          >
            Hapus permanen
          </button>
        </div>
      </div>
    </div>
  );
}
