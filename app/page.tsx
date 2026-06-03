"use client";

import { useEffect, useRef, useState } from "react";
import { Sidebar } from "./_components/sidebar";
import { ChatPanel } from "./_components/chat";
import { ChatInput } from "./_components/chat-input";
import { SettingsModal, getModelLabel } from "./_components/settings-modal";
import { LoginModal } from "./_components/login-modal";
import { ShareDialog } from "./_components/chat/share-dialog";
import { useChatState } from "./_hooks/use-chat-state";
import { DEFAULT_MODEL_NAME } from "./_constants/initial-data";
import type { UploadedFile } from "./_components/chat-input/types";

type PendingMessage = {
  text: string;
  files: UploadedFile[];
};

export default function HomePage(): React.ReactElement {
  const state = useChatState();
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
        plan: state.session.role === "admin" ? "pro" as const : "free" as const,
      }
    : null;

  useEffect(() => {
    const openLogin = (event: Event) => {
      const detail = (event as CustomEvent<PendingMessage>).detail;
      if (detail?.text || detail?.files?.length) {
        pendingMessageRef.current = { text: detail.text, files: detail.files ?? [] };
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
    state.sendMessage(pending.text, pending.files);
  }, [state.session.isAuthenticated, state.sendMessage]);

  useEffect(() => {
    state.clearAuthError();
  }, [isLoginOpen, state.clearAuthError]);

  function handleShareChat() {
    if (!state.session.isAuthenticated) {
      setIsLoginOpen(true);
      return;
    }
    setIsShareOpen(true);
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-white">
      <Sidebar
        chats={state.chats}
        activeChatId={state.activeChatId}
        onSelect={state.selectChat}
        onNewChat={state.createChat}
        onDelete={state.deleteChat}
        onRename={state.renameChat}
        user={sidebarUser}
        isAuthenticated={state.session.isAuthenticated}
        onLoginClick={() => setIsLoginOpen(true)}
        isOpen={isSidebarOpen}
      />

      <main className="relative flex min-w-0 flex-1 flex-col">
        <ChatPanel
          title={activeTitle}
          modelName={getModelLabel(state.settings.defaultModel) || DEFAULT_MODEL_NAME}
          messages={state.messages}
          isLoading={state.isLoadingConversations}
          isStreaming={state.isStreaming}
          promptSeed={state.promptSeed}
          copiedId={state.copiedId}
          feedback={state.feedback}
          onCopy={state.copyMessage}
          onFeedback={state.rateMessage}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onMore={() => setIsSettingsOpen(true)}
          sessionRole={state.session.role}
          isAuthenticated={state.session.isAuthenticated}
          onLoginClick={() => setIsLoginOpen(true)}
          onLogout={state.logout}
          isShareable={Boolean(activeChat && state.session.isAuthenticated)}
          isShared={Boolean(activeChat?.isShared)}
          shareStatus={shareStatus}
          onShare={handleShareChat}
        />
        <ChatInput
          onSend={state.sendMessage}
          isStreaming={state.isStreaming}
          isEmpty={state.messages.length === 0}
          onStop={state.stopStreaming}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={state.settings}
        isSaving={state.isSavingSettings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={state.saveSettings}
        onClearChats={state.clearChats}
      />
      <LoginModal
        isOpen={isLoginOpen}
        isLoading={state.isAuthLoading}
        error={state.authError}
        onClose={() => setIsLoginOpen(false)}
        onLogin={async (credentials) => {
          const session = await state.login(credentials);
          if (session?.isAuthenticated) setIsLoginOpen(false);
          return session;
        }}
      />
      <ShareDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        chat={activeChat}
        onShare={state.shareChat}
      />
    </div>
  );
}
