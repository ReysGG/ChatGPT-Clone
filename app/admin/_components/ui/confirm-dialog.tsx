"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./primitives";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve?: (value: boolean) => void;
}

/**
 * Promise-based confirm dialog. Usage:
 *   const { confirm, dialog } = useConfirmDialog();
 *   if (await confirm({ title: "...", tone: "danger" })) { ... }
 *   return (<>{dialog}{...}</>)
 */
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState>({ open: false, title: "" });
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, open: true, resolve });
    });
  }, []);

  const close = useCallback(
    (result: boolean) => {
      setState((prev) => {
        prev.resolve?.(result);
        return { ...prev, open: false, resolve: undefined };
      });
    },
    []
  );

  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    document.addEventListener("keydown", onKey);
    // Move focus to the confirm action when the dialog opens.
    const id = window.setTimeout(() => confirmButtonRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
    };
  }, [state.open, close]);

  const dialog = state.open ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby={state.description ? "confirm-desc" : undefined}
    >
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]"
        onClick={() => close(false)}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
        <div className="flex items-start gap-3">
          {state.tone === "danger" ? (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
            </span>
          ) : null}
          <div className="space-y-1">
            <h2 id="confirm-title" className="text-base font-semibold text-foreground">
              {state.title}
            </h2>
            {state.description ? (
              <p id="confirm-desc" className="text-sm text-muted-foreground">
                {state.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => close(false)}>
            {state.cancelLabel ?? "Batal"}
          </Button>
          <Button
            ref={confirmButtonRef as React.Ref<HTMLButtonElement>}
            variant={state.tone === "danger" ? "danger" : "primary"}
            size="sm"
            onClick={() => close(true)}
          >
            {state.confirmLabel ?? "Konfirmasi"}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
