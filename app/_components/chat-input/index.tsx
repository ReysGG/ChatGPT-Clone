"use client";

import { useState } from "react";
import { StopIcon } from "@heroicons/react/24/solid";
import { MicrophoneIcon, PaperClipIcon } from "@heroicons/react/24/outline";
import { ChevronDownIcon, GlobeIcon, ImageIcon, PencilLineIcon, WandSparklesIcon, Plus, AudioLines } from "lucide-react";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { BorderBeam } from "@/components/ui/border-beam";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import type { ChatInputProps, UploadedFile } from "./types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ".pdf,.txt,.md,.markdown,image/*";
const FILE_HINT = "PDF, TXT, MD, atau gambar (max 10MB)";
const DISCLAIMER_TEXT = "AI dapat membuat kesalahan. Periksa info penting.";

const PLACEHOLDERS = [
  "Ask anything",
  "Bantu aku bikin rencana kerja hari ini",
  "Jelaskan konsep sulit dengan contoh sederhana",
  "Tulis ulang teks ini biar lebih profesional",
  "Cari ide konten untuk minggu ini",
  "Buat prompt gambar yang detail",
];

const EMPTY_ACTIONS = [
  { label: "Create an image", icon: ImageIcon },
  { label: "Write or edit", icon: PencilLineIcon },
  { label: "Look something up", icon: GlobeIcon },
];

export function ChatInput({
  onSend,
  isStreaming = false,
  isEmpty = false,
  onStop,
}: ChatInputProps): React.ReactElement {
  const [value, setValue] = useState<string>("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [showUploader, setShowUploader] = useState<boolean>(false);

  const canSend = value.trim().length > 0 || files.length > 0;

  const handleSend = (message = value): void => {
    const trimmed = message.trim();
    if ((!trimmed && files.length === 0) || isStreaming) return;
    onSend(trimmed, files);
    setValue("");
    setFiles([]);
    setShowUploader(false);
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

  if (isEmpty && !isStreaming) {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4 pt-20">
        <FileUpload.Root className="w-full max-w-6xl">
          <div className="pointer-events-auto w-full max-w-6xl translate-y-4">
            {showUploader ? (
              <div className="flex w-full items-end gap-2 rounded-[28px] border border-white/10 bg-[#1f1f1f] p-2 shadow-2xl shadow-black/30">
                <button
                  type="button"
                  onClick={() => setShowUploader(false)}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close file uploader"
                  title="Close file uploader"
                >
                  <PaperClipIcon className="size-5" />
                </button>
                <FileUpload.DropZone
                  onDropFiles={handleDropFiles}
                  hint={FILE_HINT}
                  accept={ACCEPTED_TYPES}
                  maxSize={MAX_FILE_SIZE}
                  className="min-h-0 flex-1 rounded-xl py-2"
                />
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!canSend}
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-muted"
                  aria-label="Send"
                  title="Send"
                >
                  <WandSparklesIcon className="size-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative mx-auto h-16 w-full max-w-5xl overflow-hidden rounded-full border border-white/5 bg-[#1e1e1e] shadow-xl">
                  <BorderBeam
                    size={120}
                    duration={9}
                    borderWidth={1.25}
                    colorFrom="#a78bfa"
                    colorTo="#f59e0b"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUploader(true)}
                    className="absolute left-4 top-1/2 z-[60] grid size-9 -translate-y-1/2 place-items-center rounded-full text-zinc-400 transition hover:text-white"
                    title="Attach files"
                    aria-label="Attach files"
                  >
                    <Plus className="size-5" />
                  </button>
                  <div className="absolute inset-y-0 left-12 right-[195px] z-40 flex items-center">
                    <PlaceholdersAndVanishInput
                      placeholders={PLACEHOLDERS}
                      onChange={(e) => setValue(e.target.value)}
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSend(value);
                      }}
                      className="bg-transparent dark:bg-transparent shadow-none border-none h-full max-w-none w-full"
                      hideSubmitButton={true}
                    />
                  </div>
                  <button
                    type="button"
                    className="absolute right-[108px] top-1/2 z-[60] inline-flex -translate-y-1/2 items-center gap-1 rounded-full px-2 py-1 text-sm text-zinc-400 transition hover:text-white"
                  >
                    Extended
                    <ChevronDownIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-[64px] top-1/2 z-[60] grid size-9 -translate-y-1/2 place-items-center rounded-full text-zinc-400 transition hover:text-white"
                    aria-label="Voice input"
                    title="Voice input"
                  >
                    <MicrophoneIcon className="size-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    className="absolute right-2 top-1/2 z-[60] grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white text-black transition hover:bg-white/90 disabled:opacity-50"
                    aria-label={canSend ? "Send" : "Voice mode"}
                    title={canSend ? "Send" : "Voice mode"}
                  >
                    {canSend ? (
                      <WandSparklesIcon className="size-4" />
                    ) : (
                      <AudioLines className="size-4 text-black" />
                    )}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {EMPTY_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.label}
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3.5 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
                      >
                        <Icon className="h-4 w-4" />
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </FileUpload.Root>
      </div>
    );
  }

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

        {showUploader ? (
          <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-white/[0.06] bg-card p-2 transition-colors focus-within:border-violet-500/30">
            <button
              type="button"
              onClick={() => setShowUploader(false)}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-white/[0.06] hover:text-white"
              title="Close file uploader"
              aria-label="Close file uploader"
            >
              <PaperClipIcon className="size-5" />
            </button>
            <FileUpload.DropZone
              onDropFiles={handleDropFiles}
              hint={FILE_HINT}
              accept={ACCEPTED_TYPES}
              maxSize={MAX_FILE_SIZE}
              className="min-h-0 flex-1 rounded-xl py-2"
            />
            {isStreaming ? (
              <StopButton onStop={onStop} />
            ) : (
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!canSend}
                className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-muted"
                aria-label="Send"
                title="Send"
              >
                →
              </button>
            )}
          </div>
        ) : isStreaming ? (
          <div className="mx-auto flex h-12 w-full max-w-xl items-center justify-between rounded-full bg-white px-4 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),_0px_1px_0px_0px_rgba(25,28,33,0.02),_0px_0px_0px_1px_rgba(25,28,33,0.08)] dark:bg-zinc-800">
            <span className="text-sm text-muted">Google sedang mengetik...</span>
            <StopButton onStop={onStop} />
          </div>
        ) : (
          <div className="relative mx-auto h-16 w-full max-w-3xl overflow-hidden rounded-full border border-white/5 bg-[#1e1e1e] shadow-md">
            <BorderBeam
              size={90}
              duration={10}
              borderWidth={1.25}
              colorFrom="#a78bfa"
              colorTo="#22d3ee"
            />
            <button
              type="button"
              onClick={() => setShowUploader(true)}
              className="absolute left-4 top-1/2 z-[60] grid size-9 -translate-y-1/2 place-items-center rounded-full text-zinc-400 transition hover:text-white"
              title="Attach files"
              aria-label="Attach files"
            >
              <Plus className="size-5" />
            </button>
            <div className="absolute inset-y-0 left-12 right-[195px] z-40 flex items-center">
              <PlaceholdersAndVanishInput
                placeholders={PLACEHOLDERS}
                onChange={(e) => setValue(e.target.value)}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(value);
                }}
                className="bg-transparent dark:bg-transparent shadow-none border-none h-full max-w-none w-full"
                hideSubmitButton={true}
              />
            </div>
            <button
              type="button"
              className="absolute right-[108px] top-1/2 z-[60] inline-flex -translate-y-1/2 items-center gap-1 rounded-full px-2 py-1 text-sm text-zinc-400 transition hover:text-white"
            >
              Extended
              <ChevronDownIcon className="size-3.5" />
            </button>
            <button
              type="button"
              className="absolute right-[64px] top-1/2 z-[60] grid size-9 -translate-y-1/2 place-items-center rounded-full text-zinc-400 transition hover:text-white"
              aria-label="Voice input"
              title="Voice input"
            >
              <MicrophoneIcon className="size-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => handleSend()}
              className="absolute right-2 top-1/2 z-[60] grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white text-black transition hover:bg-white/90 disabled:opacity-50"
              aria-label={canSend ? "Send" : "Voice mode"}
              title={canSend ? "Send" : "Voice mode"}
            >
              {canSend ? (
                <WandSparklesIcon className="size-4" />
              ) : (
                <AudioLines className="size-4 text-black" />
              )}
            </button>
          </div>
        )}

        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted">
          {DISCLAIMER_TEXT}
        </p>
      </FileUpload.Root>
    </div>
  );
}

function StopButton({ onStop }: { onStop?: () => void }): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onStop}
      className="grid size-8 shrink-0 place-items-center rounded-full bg-black text-white transition hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90"
      aria-label="Stop generating"
      title="Stop generating"
    >
      <StopIcon className="size-4" />
    </button>
  );
}
