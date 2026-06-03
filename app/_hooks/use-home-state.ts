import { useState, useRef, useEffect, useCallback } from "react";
import type { UploadedFile } from "../_components/chat-input/types";
import type { UseChatState } from "./use-chat-state";

type PendingMessage = {
  text: string;
  files: UploadedFile[];
  webSearch?: boolean;
};

export function useHomeState(state: UseChatState) {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "sharing" | "copied">("idle");
  const pendingMessageRef = useRef<PendingMessage | null>(null);

  const activeChat = state.chats.find((c) => c.id === state.activeChatId) ?? null;
  const activeTitle = activeChat?.title ?? "AI Chat";

  const sidebarUser = state.session.isAuthenticated
    ? {
        name: state.session.name ?? state.session.email ?? "User",
        email: state.session.email ?? "",
        plan: state.session.role === "admin" ? ("pro" as const) : ("free" as const),
      }
    : null;

  useEffect(() => {
    const openLogin = (event: Event) => {
      const detail = (event as CustomEvent<PendingMessage>).detail;
      if (detail?.text || detail?.files?.length || detail?.webSearch) {
        pendingMessageRef.current = {
          text: detail.text,
          files: detail.files ?? [],
          webSearch: detail.webSearch,
        };
      }
      setIsLoginOpen(true);
    };

    window.addEventListener("ai-chat-login-required", openLogin);
    return () => window.removeEventListener("ai-chat-login-required", openLogin);
  }, []);

  useEffect(() => {
    if (!state.session.isAuthenticated || !pendingMessageRef.current) return;
    const pending = pendingMessageRef.current;
    pendingMessageRef.current = null;
    state.sendMessage(pending.text, pending.files, null, pending.webSearch);
  }, [state.session.isAuthenticated, state.sendMessage]);

  useEffect(() => {
    state.clearAuthError();
  }, [isLoginOpen, state.clearAuthError]);

  const handleShareChat = useCallback(() => {
    if (!state.session.isAuthenticated) {
      setIsLoginOpen(true);
      return;
    }
    setIsShareOpen(true);
  }, [state.session.isAuthenticated]);

  return {
    isSidebarOpen,
    setIsSidebarOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isLoginOpen,
    setIsLoginOpen,
    isShareOpen,
    setIsShareOpen,
    shareStatus,
    setShareStatus,
    activeChat,
    activeTitle,
    sidebarUser,
    handleShareChat,
  };
}
