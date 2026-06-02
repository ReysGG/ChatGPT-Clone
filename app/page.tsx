"use client";

import { Sidebar } from "./_components/sidebar";
import { ChatPanel } from "./_components/chat";
import { ChatInput } from "./_components/chat-input";
import { useChatState } from "./_hooks/use-chat-state";
import { CURRENT_USER } from "./_constants/user";
import { DEFAULT_MODEL_NAME } from "./_constants/initial-data";

export default function HomePage(): React.ReactElement {
  const state = useChatState();
  const activeTitle =
    state.chats.find((c) => c.id === state.activeChatId)?.title ?? "AI Chat";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-white">
      <Sidebar
        chats={state.chats}
        activeChatId={state.activeChatId}
        onSelect={state.selectChat}
        onNewChat={state.createChat}
        onDelete={state.deleteChat}
        user={CURRENT_USER}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <ChatPanel
          title={activeTitle}
          modelName={DEFAULT_MODEL_NAME}
          messages={state.messages}
          isStreaming={state.isStreaming}
          copiedId={state.copiedId}
          feedback={state.feedback}
          onCopy={state.copyMessage}
          onFeedback={state.rateMessage}
        />
        <ChatInput
          onSend={state.sendMessage}
          isStreaming={state.isStreaming}
          onStop={state.stopStreaming}
        />
      </main>
    </div>
  );
}
