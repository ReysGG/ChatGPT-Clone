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
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          let icon = <Info className="size-5 text-blue-400" />;
          let border = "border-blue-500/20";
          let bg = "bg-blue-950/40";
          let glow = "shadow-blue-500/5";

          if (t.type === "success") {
            icon = <CheckCircle2 className="size-5 text-emerald-400" />;
            border = "border-emerald-500/20";
            bg = "bg-emerald-950/40";
            glow = "shadow-emerald-500/5";
          } else if (t.type === "error") {
            icon = <AlertCircle className="size-5 text-red-400" />;
            border = "border-red-500/20";
            bg = "bg-red-950/40";
            glow = "shadow-red-500/5";
          } else if (t.type === "warning") {
            icon = <AlertTriangle className="size-5 text-amber-400" />;
            border = "border-amber-500/20";
            bg = "bg-amber-950/40";
            glow = "shadow-amber-500/5";
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border ${border} ${bg} backdrop-blur-md p-4 text-white shadow-lg ${glow} animate-slide-up-fade transition-all duration-300`}
              role="alert"
            >
              <div className="flex gap-2.5">
                <span className="mt-0.5 shrink-0">{icon}</span>
                <p className="text-xs font-medium text-zinc-200 leading-relaxed">
                  {t.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 rounded-md p-0.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
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
