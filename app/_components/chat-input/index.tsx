"use client";

import { useState, KeyboardEvent } from "react";
import { StopIcon } from "@heroicons/react/24/solid";
import {
  PaperAirplaneIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import type { ChatInputProps, UploadedFile } from "./types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ".pdf,.txt,.md,.markdown,image/*";
const FILE_HINT = "PDF, TXT, MD, atau gambar (max 10MB)";
const INPUT_PLACEHOLDER = "Tanya apa saja…";
const DISCLAIMER_TEXT = "AI dapat membuat kesalahan. Periksa info penting.";

export function ChatInput({
  onSend,
  isStreaming = false,
  onStop,
}: ChatInputProps): React.ReactElement {
  const [value, setValue] = useState<string>("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [showUploader, setShowUploader] = useState<boolean>(false);

  const canSend = value.trim().length > 0 || files.length > 0;

  const handleSend = (): void => {
    if (!canSend || isStreaming) return;
    onSend(value.trim(), files);
    setValue("");
    setFiles([]);
    setShowUploader(false);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDropFiles = (dropped: FileList): void => {
    const next: UploadedFile[] = Array.from(dropped).map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    setFiles((prev) => [...prev, ...next]);
    setShowUploader(true);
  };

  return (
    <div className="border-t border-white/[0.06] bg-bg px-4 pb-3 pt-3">
      <FileUpload.Root>
        {showUploader && files.length > 0 && (
          <FileUpload.List>
            {files.map((f) => (
              <FileUpload.ListItemProgressBar
                key={f.id}
                name={f.name}
                size={f.size}
                progress={100}
                type={f.type as never}
                onDelete={() =>
                  setFiles((prev) => prev.filter((p) => p.id !== f.id))
                }
              />
            ))}
          </FileUpload.List>
        )}

        <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-white/[0.06] bg-card p-2 transition-colors focus-within:border-violet-500/30">
          <button
            type="button"
            onClick={() => setShowUploader((v) => !v)}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-white/[0.06] hover:text-white"
            title="Attach files"
            aria-label="Attach files"
          >
            <PaperClipIcon className="size-5" />
          </button>

          {showUploader ? (
            <FileUpload.DropZone
              onDropFiles={handleDropFiles}
              hint={FILE_HINT}
              accept={ACCEPTED_TYPES}
              maxSize={MAX_FILE_SIZE}
              className="min-h-0 flex-1 rounded-xl py-2"
            />
          ) : (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKey}
              placeholder={INPUT_PLACEHOLDER}
              rows={1}
              className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-sm text-white placeholder:text-muted focus:outline-none"
            />
          )}

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-black transition hover:bg-white/90"
              aria-label="Stop generating"
              title="Stop generating"
            >
              <StopIcon className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-md shadow-violet-500/30 transition hover:from-violet-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:from-white/10 disabled:to-white/10 disabled:text-muted disabled:shadow-none"
              aria-label="Send"
              title="Send"
            >
              <PaperAirplaneIcon className="size-4 -translate-y-px -rotate-45" />
            </button>
          )}
        </div>

        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted">
          {DISCLAIMER_TEXT}
        </p>
      </FileUpload.Root>
    </div>
  );
}
