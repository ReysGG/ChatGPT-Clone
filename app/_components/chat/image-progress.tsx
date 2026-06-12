"use client";

import { memo } from "react";
import { ImageIcon, Loader2, CheckCircle, AlertCircle, Download, Globe } from "lucide-react";

export type ImageGenStage =
  | "connecting"
  | "navigating"
  | "inputting"
  | "generating"
  | "downloading"
  | "done"
  | "error";

interface ImageProgressProps {
  stage: ImageGenStage;
  message: string;
}

const STAGES: { key: ImageGenStage; label: string; icon: React.ElementType }[] = [
  { key: "connecting", label: "Menghubungkan", icon: Globe },
  { key: "navigating", label: "Membuka Flow", icon: Globe },
  { key: "inputting", label: "Menginput prompt", icon: ImageIcon },
  { key: "generating", label: "Generate gambar", icon: Loader2 },
  { key: "downloading", label: "Mendownload", icon: Download },
  { key: "done", label: "Selesai", icon: CheckCircle },
];

const stageOrder: Record<ImageGenStage, number> = {
  connecting: 0,
  navigating: 1,
  inputting: 2,
  generating: 3,
  downloading: 4,
  done: 5,
  error: -1,
};

export const ImageProgress = memo(function ImageProgress({
  stage,
  message,
}: ImageProgressProps): React.ReactElement {
  const currentOrder = stageOrder[stage];

  if (stage === "error") {
    return (
      <div className="flex items-start gap-3 rounded-2xl rounded-tl-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/30 dark:bg-red-950/20">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-500" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Gagal Generate Gambar
          </p>
          <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-400/70">
            {message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="relative">
          <ImageIcon className="size-5 text-primary" />
          {stage !== "done" && (
            <span className="absolute -right-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-amber-400" />
          )}
        </div>
        <span className="text-sm font-medium text-foreground">
          Membuat Gambar
        </span>
      </div>

      {/* Progress steps */}
      <div className="space-y-2">
        {STAGES.map((s) => {
          const order = stageOrder[s.key];
          const isActive = order === currentOrder;
          const isDone = currentOrder > order;
          const isPending = currentOrder < order;
          const Icon = s.icon;

          return (
            <div
              key={s.key}
              className={`flex items-center gap-2.5 text-xs transition-all duration-300 ${
                isActive
                  ? "text-primary"
                  : isDone
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground/40"
              }`}
            >
              {isDone ? (
                <CheckCircle className="size-3.5 text-emerald-500" />
              ) : isActive ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Icon className={`size-3.5 ${isPending ? "opacity-30" : ""}`} />
              )}
              <span
                className={`${isActive ? "font-medium" : ""} ${isPending ? "opacity-40" : ""}`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current status message */}
      <div className="mt-3 border-t border-border/50 pt-2">
        <p className="text-[11px] text-muted-foreground">{message}</p>
      </div>

      {/* Shimmer animation bar */}
      {stage !== "done" && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted/30">
          <div className="animate-image-gen-shimmer h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>
      )}
    </div>
  );
});

ImageProgress.displayName = "ImageProgress";
