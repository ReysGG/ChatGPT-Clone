"use client";

import { useEffect, useState } from "react";
import { XMarkIcon, ClipboardDocumentIcon, ClipboardDocumentCheckIcon, GlobeAltIcon, PowerIcon } from "@heroicons/react/24/outline";
import { BorderBeam } from "@/components/ui/border-beam";
import type { ChatItem } from "../sidebar/types";
import { useModalAccessibility } from "../../_hooks/use-modal-accessibility";
import { useToast } from "@/components/ui/toast-provider";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chat: ChatItem | null;
  onShare: (id: string, isShared: boolean) => Promise<ChatItem | void> | void;
}

export function ShareDialog({
  isOpen,
  onClose,
  chat,
  onShare,
}: ShareDialogProps): React.ReactElement | null {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();
  const { modalRef, handleBackdropClick } = useModalAccessibility(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setIsCopied(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !chat) return null;

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/share/${chat.shareId || ""}`
    : "";

  async function handleToggleShare() {
    if (!chat) return;
    setIsLoading(true);
    setError(null);
    try {
      // Toggle isShared
      const nextSharedState = !chat.isShared;
      await onShare(chat.id, nextSharedState);
      setIsCopied(false);
      toastSuccess(nextSharedState ? "Chat berhasil dibagikan secara publik!" : "Berbagi chat dinonaktifkan.");
    } catch (err) {
      const msg = (err as Error).message || "Gagal memperbarui status berbagi.";
      setError(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      toastSuccess("Tautan berhasil disalin!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      setError("Gagal menyalin link ke clipboard.");
      toastError("Gagal menyalin link.");
    }
  }

  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl">
        <BorderBeam
          size={90}
          duration={8}
          borderWidth={1.5}
          colorFrom="#3b5979"
          colorTo="#e5e5e1"
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Share Conversation</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bagikan chat ini kepada orang lain.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted/15 hover:text-foreground transition"
            aria-label="Close share modal"
          >
            <XMarkIcon className="size-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-600 dark:text-red-300 font-medium">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          {chat.isShared ? (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                <GlobeAltIcon className="size-5 shrink-0" />
                <span>Chat ini telah dibagikan secara publik</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Tautan Publik</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none select-all focus:border-primary/50 transition"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/95 transition shrink-0"
                  >
                    {isCopied ? (
                      <>
                        <ClipboardDocumentCheckIcon className="size-4 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="size-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <a
                  href={`/share/${chat.shareId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-muted/10 hover:bg-muted/20 py-2 text-sm font-semibold text-foreground transition text-center"
                >
                  <GlobeAltIcon className="size-4" />
                  Open Public Page
                </a>
                <button
                  type="button"
                  onClick={handleToggleShare}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 py-2 text-sm font-semibold text-white transition"
                >
                  <PowerIcon className="size-4" />
                  {isLoading ? "Revoking..." : "Stop Sharing"}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted/10 text-muted-foreground border border-border">
                <GlobeAltIcon className="size-6" />
              </div>
              <p className="text-sm text-muted-foreground px-4 leading-relaxed">
                Siapa pun yang memiliki link ini akan dapat membaca riwayat percakapan ini. Kamu dapat menghentikan share kapan saja.
              </p>
              <button
                type="button"
                onClick={handleToggleShare}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary hover:bg-primary/95 disabled:opacity-50 py-2.5 text-sm font-semibold text-primary-foreground transition"
              >
                {isLoading ? "Membagikan..." : "Bagikan Percakapan Ini"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
