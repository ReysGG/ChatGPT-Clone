"use client";

import { Sidebar } from "./_components/sidebar/index";
import { ChatPanel } from "./_components/chat/index";
import { ChatInput } from "./_components/chat-input/index";
import { SettingsModal, getModelLabel } from "./_components/settings-modal";
import { LoginModal } from "./_components/login-modal";
import { ShareDialog } from "./_components/chat/share-dialog";
import { useChatState } from "./_hooks/use-chat-state";
import { useHomeState } from "./_hooks/use-home-state";
import { DEFAULT_MODEL_NAME } from "./_constants/initial-data";

export default function HomeClient(): React.ReactElement {
  const state = useChatState();
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isLoginOpen,
    setIsLoginOpen,
    isShareOpen,
    setIsShareOpen,
    shareStatus,
    activeChat,
    activeTitle,
    sidebarUser,
    handleShareChat,
  } = useHomeState(state);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-white">
      <Sidebar
        chats={state.chats}
        activeChatId={state.activeChatId}
        onSelect={state.selectChat}
        onNewChat={state.createChat}
        onDelete={state.deleteChat}
        onRename={state.renameChat}
        onSearch={state.searchConversations}
        user={sidebarUser}
        isAuthenticated={state.session.isAuthenticated}
        sessionRole={state.session.role}
        onLoginClick={() => setIsLoginOpen(true)}
        onLogout={state.logout}
        isOpen={isSidebarOpen}
        isLoading={state.isLoadingConversations}
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
          activeTags={activeChat?.tags || []}
          onUpdateTags={async (tagNames) => {
            if (activeChat) {
              await state.updateTags(activeChat.id, tagNames);
            }
          }}
          isGeneratingImage={state.isGeneratingImage}
          imageGenProgress={state.imageGenProgress}
        />
        <ChatInput
          onSend={(message, files, webSearch) => state.sendMessage(message, files, null, webSearch)}
          onImageGenerate={(prompt) => state.generateImage(prompt)}
          isStreaming={state.isStreaming}
          isGeneratingImage={state.isGeneratingImage}
          isEmpty={state.messages.length === 0}
          onStop={state.stopStreaming}
          session={state.session}
          onLoginClick={() => setIsLoginOpen(true)}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={state.settings}
        isSaving={state.isSavingSettings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={state.saveSettings}
        onClearChats={state.clearChats}
        isAuthenticated={state.session.isAuthenticated}
        onLoginClick={() => setIsLoginOpen(true)}
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
