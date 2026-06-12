import { memo, useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { Download, Maximize2, X } from "lucide-react";
import { CopyButton } from "./copy-button";
import { FeedbackButton } from "./feedback-button";
import { MarkdownContent } from "./markdown-content";
import type { FeedbackValue, Message } from "./types";
import { formatClockTime } from "./format";

interface AssistantMessageProps {
  message: Message;
  isStreaming: boolean;
  copiedId: string | null;
  feedback: FeedbackValue | null;
  onCopy: (id: string, content: string) => void;
  onFeedback: (id: string, value: FeedbackValue) => void;
}

/**
 * Detect if assistant message content contains a generated image.
 * Pattern: ![alt](url)
 */
function extractImage(
  content: string
): { imageUrl: string; alt: string; caption: string } | null {
  const match = content.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  if (!match) return null;

  const alt = match[1];
  const imageUrl = match[2];
  // Caption is everything after the image markdown
  const caption = content.replace(match[0], "").replace(/^\s*\n*/, "").trim();

  return { imageUrl, alt, caption };
}

export const AssistantMessage = memo(function AssistantMessage({
  message,
  isStreaming,
  copiedId,
  feedback,
  onCopy,
  onFeedback,
}: AssistantMessageProps): React.ReactElement {
  const imageData = extractImage(message.content);

  return (
    <li className="flex gap-3">
      <div
        className="grid size-8 shrink-0 place-items-center rounded-full text-primary bg-primary/10 border border-primary/20"
        aria-hidden
      >
        <SparklesIcon className="size-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm">
          {imageData ? (
            <GeneratedImage
              imageUrl={imageData.imageUrl}
              alt={imageData.alt}
              caption={imageData.caption}
            />
          ) : message.content ? (
            <MarkdownContent content={message.content} />
          ) : isStreaming ? (
            "…"
          ) : (
            ""
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
          <span>{message.createdAt ?? formatClockTime()}</span>
          <span className="text-border">·</span>
          <CopyButton
            copied={copiedId === message.id}
            onClick={() => onCopy(message.id, message.content)}
          />
          <FeedbackButton
            active={feedback === "up"}
            kind="up"
            label="Good response"
            onClick={() => onFeedback(message.id, "up")}
          />
          <FeedbackButton
            active={feedback === "down"}
            kind="down"
            label="Bad response"
            onClick={() => onFeedback(message.id, "down")}
          />
        </div>
      </div>
    </li>
  );
});

AssistantMessage.displayName = "AssistantMessage";

/**
 * Renders a generated image with lightbox, download, and caption.
 */
function GeneratedImage({
  imageUrl,
  alt,
  caption,
}: {
  imageUrl: string;
  alt: string;
  caption: string;
}): React.ReactElement {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <>
      <div className="group relative">
        {/* Image container with shimmer placeholder */}
        <div className="relative overflow-hidden rounded-xl">
          {!isLoaded && (
            <div className="aspect-square w-full max-w-md animate-pulse rounded-xl bg-muted/30" />
          )}
          <img
            src={imageUrl}
            alt={alt}
            className={`w-full max-w-md rounded-xl shadow-md transition-opacity duration-500 ${
              isLoaded ? "opacity-100" : "opacity-0 absolute inset-0"
            }`}
            onLoad={() => setIsLoaded(true)}
            loading="lazy"
          />

          {/* Overlay buttons */}
          {isLoaded && (
            <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="grid size-8 place-items-center rounded-lg bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                aria-label="View full size"
                title="Lihat ukuran penuh"
              >
                <Maximize2 className="size-4" />
              </button>
              <a
                href={imageUrl}
                download
                className="grid size-8 place-items-center rounded-lg bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                aria-label="Download image"
                title="Download gambar"
              >
                <Download className="size-4" />
              </a>
            </div>
          )}
        </div>

        {/* Caption */}
        {caption && (
          <p className="mt-2 text-xs italic text-muted-foreground">{caption}</p>
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setIsLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close lightbox"
          >
            <X className="size-5" />
          </button>
          <img
            src={imageUrl}
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

