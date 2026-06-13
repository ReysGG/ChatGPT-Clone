"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      setToasts((prev) => [...prev, { id, type, message }]);

      // Auto dismiss after 3.5s
      setTimeout(() => {
        removeToast(id);
      }, 3500);
    },
    [removeToast]
  );

  const success = useCallback(
    (msg: string) => showToast("success", msg),
    [showToast]
  );
  const error = useCallback(
    (msg: string) => showToast("error", msg),
    [showToast]
  );
  const info = useCallback(
    (msg: string) => showToast("info", msg),
    [showToast]
  );
  const warning = useCallback(
    (msg: string) => showToast("warning", msg),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{ toast: showToast, success, error, info, warning }}
    >
      {children}
      {/* Toast Portal Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex w-full max-w-sm flex-col gap-2 px-4 pointer-events-none sm:px-0">
        {toasts.map((t) => {
          let icon = <Info className="size-5 text-primary" />;
          if (t.type === "success") {
            icon = <CheckCircle2 className="size-5 text-[var(--color-fg-success-primary)]" />;
          } else if (t.type === "error") {
            icon = <AlertCircle className="size-5 text-destructive" />;
          } else if (t.type === "warning") {
            icon = <AlertTriangle className="size-5 text-[#9a6700]" />;
          }

          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-4 text-foreground shadow-[0_4px_20px_rgba(0,0,0,0.08)] animate-slide-up-fade"
              role="alert"
            >
              <div className="flex gap-2.5">
                <span className="mt-0.5 shrink-0">{icon}</span>
                <p className="text-xs font-medium leading-relaxed text-foreground">
                  {t.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Tutup notifikasi"
                className="shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
