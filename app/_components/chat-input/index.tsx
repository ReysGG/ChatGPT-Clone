"use client";

import { useState } from "react";
import { StopIcon } from "@heroicons/react/24/solid";
import { MicrophoneIcon, PaperClipIcon } from "@heroicons/react/24/outline";
import { ChevronDownIcon, GlobeIcon, ImageIcon, PencilLineIcon, WandSparklesIcon, Plus, AudioLines, BookOpen } from "lucide-react";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";
import { BorderBeam } from "@/components/ui/border-beam";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import type { ChatInputProps, UploadedFile } from "./types";
import { PromptLibraryModal } from "../prompt-library-modal";

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

/** Keywords that trigger image generation instead of normal chat. */
const IMAGE_KEYWORDS = [
  /^\/image\s+/i,
  /^create\s+image[:\s]+/i,
  /^generate\s+image[:\s]+/i,
  /^buat\s+gambar[:\s]+/i,
  /^bikin\s+gambar[:\s]+/i,
  /^generate\s+gambar[:\s]+/i,
  /^create\s+an?\s+image[:\s]+/i,
];

function extractImagePrompt(text: string): string | null {
  for (const pattern of IMAGE_KEYWORDS) {
    const match = text.match(pattern);
    if (match) {
      return text.slice(match[0].length).trim();
    }
  }
  return null;
}

export function ChatInput({
  onSend,
  onImageGenerate,
  isStreaming = false,
  isGeneratingImage = false,
  isEmpty = false,
  onStop,
  session,
  onLoginClick,
}: ChatInputProps): React.ReactElement {
  const [value, setValue] = useState<string>("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [showUploader, setShowUploader] = useState<boolean>(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [webSearch, setWebSearch] = useState<boolean>(false);
  const [uploadingFiles, setUploadingFiles] = useState<
    Record<string, { progress: number; error?: string; fileObject?: File }>
  >({});

  const isAnyUploading = Object.values(uploadingFiles).some((u) => !u.error);
  const isBusy = isStreaming || isGeneratingImage;
  const canSend = (value.trim().length > 0 || files.length > 0) && !isAnyUploading && !isBusy;

  const uploadFile = async (file: File, tempId: string) => {
    setUploadingFiles((prev) => ({
      ...prev,
      [tempId]: { progress: 10, fileObject: file },
    }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal mengunggah berkas");
      }

      const { upload } = await res.json();

      setFiles((prev) =>
        prev.map((f) =>
          f.id === tempId
            ? {
                id: upload.id,
                name: upload.filename,
                size: upload.sizeBytes,
                type: upload.mimeType,
              }
            : f
        )
      );

      setUploadingFiles((prev) => {
        const copy = { ...prev };
        delete copy[tempId];
        return copy;
      });
    } catch (error) {
      console.error("Gagal upload file:", error);
      setUploadingFiles((prev) => ({
        ...prev,
        [tempId]: {
          ...prev[tempId],
          progress: 0,
          error: (error as Error).message || "Gagal mengunggah",
        },
      }));
    }
  };

  const handleRetry = (tempId: string) => {
    const fileObj = uploadingFiles[tempId]?.fileObject;
    if (fileObj) {
      void uploadFile(fileObj, tempId);
    }
  };

  const handleSend = (message = value): void => {
    const trimmed = message.trim();
    if ((!trimmed && files.length === 0) || isBusy || isAnyUploading) return;

    // Check if message is an image generation request
    const imagePrompt = extractImagePrompt(trimmed);
    if (imagePrompt && onImageGenerate && files.length === 0) {
      onImageGenerate(imagePrompt);
      setValue("");
      return;
    }

    onSend(trimmed, files, webSearch);
    setValue("");
    setFiles([]);
    setShowUploader(false);
  };

  const handleDropFiles = (dropped: FileList): void => {
    if (!session.isAuthenticated) {
      onLoginClick();
      return;
    }

    Array.from(dropped).forEach((f, i) => {
      const tempId = `temp-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
      const newFile: UploadedFile = {
        id: tempId,
        name: f.name,
        size: f.size,
        type: f.type,
      };

      setFiles((prev) => [...prev, newFile]);
      setShowUploader(true);

      void uploadFile(f, tempId);
    });
  };

  if (isEmpty && !isStreaming) {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4 pt-20">
        <FileUpload.Root className="w-full max-w-6xl">
          {showUploader && files.length > 0 && (
            <FileUpload.List className="mb-4 pointer-events-auto">
              {files.map((f) => {
                const uploadState = uploadingFiles[f.id];
                return (
                  <FileUpload.ListItemProgressBar
                    key={f.id}
                    name={f.name}
                    size={f.size}
                    progress={uploadState ? uploadState.progress : 100}
                    failed={!!uploadState?.error}
                    type={f.type as never}
                    onDelete={async () => {
                      setFiles((prev) => prev.filter((p) => p.id !== f.id));
                      setUploadingFiles((prev) => {
                        const copy = { ...prev };
                        delete copy[f.id];
                        return copy;
                      });
                      if (!f.id.startsWith("temp-")) {
                        try {
                          await fetch(`/api/uploads/${f.id}`, { method: "DELETE" });
                        } catch (err) {
                          console.error("Gagal menghapus upload:", err);
                        }
                      }
                    }}
                    onRetry={() => handleRetry(f.id)}
                  />
                );
              })}
            </FileUpload.List>
          )}
          <div className="pointer-events-auto w-full max-w-6xl translate-y-4">
            {showUploader ? (
              <div className="flex w-full items-end gap-2 rounded-[28px] border border-border bg-card p-2 shadow-md shadow-black/5">
                <button
                  type="button"
                  onClick={() => setShowUploader(false)}
                  className="grid size-10 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted/15 hover:text-foreground"
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
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/95 disabled:cursor-not-allowed disabled:bg-muted/10 disabled:text-muted-foreground dark:bg-white dark:text-black"
                  aria-label="Send"
                  title="Send"
                >
                  <WandSparklesIcon className="size-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative mx-auto h-16 w-full max-w-5xl overflow-hidden rounded-full border border-border bg-card shadow-sm">
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
                    className="absolute left-4 top-1/2 z-[60] grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:text-foreground hover:bg-muted/10"
                    title="Attach files"
                    aria-label="Attach files"
                  >
                    <Plus className="size-5" />
                  </button>
                  <div className="absolute inset-y-0 left-12 right-[285px] z-40 flex items-center">
                    <PlaceholdersAndVanishInput
                      placeholders={PLACEHOLDERS}
                      value={value}
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
                    onClick={() => setWebSearch((prev) => !prev)}
                    className={`absolute right-[240px] top-1/2 z-[60] grid size-9 -translate-y-1/2 place-items-center rounded-full transition ${
                      webSearch
                        ? "bg-primary/20 text-primary hover:text-primary/90"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                    }`}
                    aria-label="Web Search"
                    title={webSearch ? "Web Search (Aktif)" : "Web Search (Nonaktif)"}
                  >
                    <GlobeIcon className="size-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLibraryOpen(true)}
                    className="absolute right-[108px] top-1/2 z-[60] grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:text-foreground hover:bg-muted/10"
                    aria-label="Prompt Library"
                    title="Prompt Library"
                  >
                    <BookOpen className="size-[18px]" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-[152px] top-1/2 z-[60] inline-flex -translate-y-1/2 items-center gap-1 rounded-full px-2 py-1 text-sm text-muted-foreground transition hover:text-foreground hover:bg-muted/10"
                  >
                    Extended
                    <ChevronDownIcon className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-[64px] top-1/2 z-[60] grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:text-foreground hover:bg-muted/10"
                    aria-label="Voice input"
                    title="Voice input"
                  >
                    <MicrophoneIcon className="size-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    className="absolute right-2 top-1/2 z-[60] grid size-12 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/95 disabled:opacity-50 dark:bg-white dark:text-black"
                    aria-label={canSend ? "Send" : "Voice mode"}
                    title={canSend ? "Send" : "Voice mode"}
                  >
                    {canSend ? (
                      <WandSparklesIcon className="size-4" />
                    ) : (
                      <AudioLines className="size-4 text-primary-foreground dark:text-black" />
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
                        onClick={() => {
                          if (action.label === "Look something up") {
                            setWebSearch(true);
                          } else if (action.label === "Create an image") {
                            setValue("/image ");
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm text-foreground/80 transition hover:border-muted hover:bg-muted/10 hover:text-foreground"
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
    <div className="border-t border-border bg-background px-4 pb-3 pt-3">
      <FileUpload.Root>
        {showUploader && files.length > 0 && (
          <FileUpload.List>
            {files.map((f) => {
              const uploadState = uploadingFiles[f.id];
              return (
                <FileUpload.ListItemProgressBar
                  key={f.id}
                  name={f.name}
                  size={f.size}
                  progress={uploadState ? uploadState.progress : 100}
                  failed={!!uploadState?.error}
                  type={f.type as never}
                  onDelete={async () => {
                    setFiles((prev) => prev.filter((p) => p.id !== f.id));
                    setUploadingFiles((prev) => {
                      const copy = { ...prev };
                      delete copy[f.id];
                      return copy;
                    });
                    if (!f.id.startsWith("temp-")) {
                      try {
                        await fetch(`/api/uploads/${f.id}`, { method: "DELETE" });
                      } catch (err) {
                        console.error("Gagal menghapus upload:", err);
                      }
                    }
                  }}
                  onRetry={() => handleRetry(f.id)}
                />
              );
            })}
          </FileUpload.List>
        )}

        {showUploader ? (
          <div className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-border bg-card p-2 transition-colors focus-within:border-primary/30">
            <button
              type="button"
              onClick={() => setShowUploader(false)}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted/15 hover:text-foreground"
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
                className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/95 disabled:cursor-not-allowed disabled:bg-muted/10 disabled:text-muted-foreground dark:bg-white dark:text-black"
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
          <div className="relative mx-auto h-16 w-full max-w-3xl overflow-hidden rounded-full border border-border bg-card shadow-sm">
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
              className="absolute left-4 top-1/2 z-[60] grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:text-foreground hover:bg-muted/10"
              title="Attach files"
              aria-label="Attach files"
            >
              <Plus className="size-5" />
            </button>
            <div className="absolute inset-y-0 left-12 right-[285px] z-40 flex items-center">
              <PlaceholdersAndVanishInput
                placeholders={PLACEHOLDERS}
                value={value}
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
              onClick={() => setWebSearch((prev) => !prev)}
              className={`absolute right-[240px] top-1/2 z-[60] grid size-9 -translate-y-1/2 place-items-center rounded-full transition ${
                webSearch
                  ? "bg-primary/20 text-primary hover:text-primary/90"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
              }`}
              aria-label="Web Search"
              title={webSearch ? "Web Search (Aktif)" : "Web Search (Nonaktif)"}
            >
              <GlobeIcon className="size-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => setIsLibraryOpen(true)}
              className="absolute right-[108px] top-1/2 z-[60] grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:text-foreground hover:bg-muted/10"
              aria-label="Prompt Library"
              title="Prompt Library"
            >
              <BookOpen className="size-[18px]" />
            </button>
            <button
              type="button"
              className="absolute right-[152px] top-1/2 z-[60] inline-flex -translate-y-1/2 items-center gap-1 rounded-full px-2 py-1 text-sm text-muted-foreground transition hover:text-foreground hover:bg-muted/10"
            >
              Extended
              <ChevronDownIcon className="size-3.5" />
            </button>
            <button
              type="button"
              className="absolute right-[64px] top-1/2 z-[60] grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:text-foreground hover:bg-muted/10"
              aria-label="Voice input"
              title="Voice input"
            >
              <MicrophoneIcon className="size-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => handleSend()}
              className="absolute right-2 top-1/2 z-[60] grid size-12 -translate-y-1/2 place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/95 disabled:opacity-50 dark:bg-white dark:text-black"
              aria-label={canSend ? "Send" : "Voice mode"}
              title={canSend ? "Send" : "Voice mode"}
            >
              {canSend ? (
                <WandSparklesIcon className="size-4" />
              ) : (
                <AudioLines className="size-4 text-primary-foreground dark:text-black" />
              )}
            </button>
          </div>
        )}

        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted">
          {DISCLAIMER_TEXT}
        </p>
      </FileUpload.Root>

      <PromptLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onInsert={(body) => {
          setValue(body);
        }}
        onSend={(body) => {
          handleSend(body);
        }}
        session={session}
        onLoginClick={onLoginClick}
      />
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
