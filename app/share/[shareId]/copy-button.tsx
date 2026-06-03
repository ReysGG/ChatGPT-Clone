"use client";

import { useState } from "react";
import { LinkIcon, CheckIcon } from "@heroicons/react/24/outline";

export function CopyButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Gagal menyalin link:", err);
      }
    })();
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/[0.08]"
    >
      {copied ? (
        <>
          <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
          <span>Tersalin!</span>
        </>
      ) : (
        <>
          <LinkIcon className="h-3.5 w-3.5 text-zinc-400" />
          <span>Copy link</span>
        </>
      )}
    </button>
  );
}
