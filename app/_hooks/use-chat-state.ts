"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatItem } from "../_components/sidebar/types";
import type { FeedbackValue, Message } from "../_components/chat/types";
import type { UploadedFile } from "../_components/chat-input/types";

const COPY_FEEDBACK_MS = 1_500;
const STREAM_ASSISTANT_ID = "streaming-assistant";

type ApiConversation = ChatItem & { createdAt?: string };
type ApiMessage = Omit<Message, "role"> & { role: string };

type StreamMeta = {
  conversation: ApiConversation;
  userMessage: ApiMessage;
};

type StreamDone = {
  conversation: ApiConversation;
  assistantMessage: ApiMessage;
};

const nextId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;

const toMessage = (message: ApiMessage): Message => ({
  id: message.id,
  role: message.role === "assistant" ? "assistant" : "user",
  content: message.content,
  createdAt: message.createdAt
    ? new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(message.createdAt))
    : undefined,
});

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data as T;
}

function parseSseEvent(raw: string): { event: string; data: unknown } | null {
  const lines = raw.split("\n");
  const eventLine = lines.find((line) => line.startsWith("event: "));
  const dataLine = lines.find((line) => line.startsWith("data: "));

  if (!dataLine) return null;

  return {
    event: eventLine?.slice(7).trim() || "message",
    data: JSON.parse(dataLine.slice(6)),
  };
}

function replaceMessage(
  messages: Message[],
  id: string,
  next: Message
): Message[] {
  const index = messages.findIndex((message) => message.id === id);
  if (index === -1) return [...messages, next];

  const copy = [...messages];
  copy[index] = next;
  return copy;
}

function uniqueById(messages: Message[]): Message[] {
  return messages.filter(
    (message, index, arr) => arr.findIndex((item) => item.id === message.id) === index
  );
}

export interface UseChatState {
  chats: ChatItem[];
  activeChatId: string | null;
  messages: Message[];
  isLoadingConversations: boolean;
  isStreaming: boolean;
  promptSeed: number;
  copiedId: string | null;
  feedback: Record<string, FeedbackValue | null>;
  selectChat: (id: string) => void;
  createChat: () => void;
  deleteChat: (id: string) => void;
  sendMessage: (text: string, files: UploadedFile[]) => void;
  stopStreaming: () => void;
  copyMessage: (id: string, content: string) => void;
  rateMessage: (id: string, value: FeedbackValue) => void;
}

export function useChatState(): UseChatState {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({});
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, FeedbackValue | null>>({});
  const [promptSeed, setPromptSeed] = useState<number>(0);
  const abortRef = useRef<AbortController | null>(null);

  const activeMessages = activeChatId ? messagesByChat[activeChatId] ?? [] : [];

  const loadMessages = useCallback(async (chatId: string) => {
    const data = await fetchJson<{ messages: ApiMessage[] }>(
      `/api/conversations/${chatId}/messages`
    );
    setMessagesByChat((prev) => ({
      ...prev,
      [chatId]: data.messages.map(toMessage),
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadConversations() {
      try {
        const data = await fetchJson<{ conversations: ApiConversation[] }>(
          "/api/conversations"
        );
        if (cancelled) return;

        setChats(data.conversations);
        const firstId = data.conversations[0]?.id ?? null;
        setActiveChatId(firstId);
        if (firstId) {
          await loadMessages(firstId);
        }
      } catch (error) {
        console.error("Failed to load conversations", error);
      } finally {
        if (!cancelled) {
          setIsLoadingConversations(false);
        }
      }
    }

    void loadConversations();

    return () => {
      cancelled = true;
    };
  }, [loadMessages]);

  const selectChat = useCallback(
    (id: string) => {
      setActiveChatId(id);
      if (!messagesByChat[id]) {
        void loadMessages(id);
      }
    },
    [loadMessages, messagesByChat]
  );

  const createChat = useCallback(() => {
    void (async () => {
      const data = await fetchJson<{ conversation: ApiConversation }>(
        "/api/conversations",
        { method: "POST" }
      );
      setChats((prev) => [data.conversation, ...prev]);
      setMessagesByChat((prev) => ({ ...prev, [data.conversation.id]: [] }));
      setPromptSeed((prev) => prev + 1);
      setActiveChatId(data.conversation.id);
    })();
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      void (async () => {
        await fetchJson<{ ok: boolean }>(`/api/conversations/${id}`, {
          method: "DELETE",
        });

        setChats((prev) => {
          const next = prev.filter((chat) => chat.id !== id);
          setActiveChatId((cur) => (cur === id ? next[0]?.id ?? null : cur));
          return next;
        });
        setMessagesByChat((prev) => {
          const { [id]: _drop, ...rest } = prev;
          return rest;
        });
      })();
    },
    []
  );

  const sendMessage = useCallback(
    (text: string, files: UploadedFile[]) => {
      if (isStreaming) return;

      const targetChatId = activeChatId;
      const optimisticChatId = targetChatId ?? `temp-${nextId()}`;
      const optimisticUserMessage: Message = {
        id: `temp-user-${nextId()}`,
        role: "user",
        content: text,
        files: files.length > 0 ? files : undefined,
      };
      const streamingAssistantMessage: Message = {
        id: STREAM_ASSISTANT_ID,
        role: "assistant",
        content: "",
      };

      setMessagesByChat((prev) => ({
        ...prev,
        [optimisticChatId]: [
          ...(prev[optimisticChatId] ?? []),
          optimisticUserMessage,
          streamingAssistantMessage,
        ],
      }));
      setActiveChatId(optimisticChatId);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      void (async () => {
        let confirmedChatId = optimisticChatId;
        let confirmedUserMessage: Message | null = null;
        let streamedText = "";

        try {
          const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: targetChatId,
              message: text,
              stream: true,
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || `Request failed: ${response.status}`);
          }

          if (!response.body) {
            throw new Error("Streaming response is not supported by this browser.");
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() ?? "";

            for (const rawEvent of events) {
              const parsed = parseSseEvent(rawEvent);
              if (!parsed) continue;

              if (parsed.event === "meta") {
                const data = parsed.data as StreamMeta;
                confirmedChatId = data.conversation.id;
                confirmedUserMessage = toMessage(data.userMessage);

                setChats((prev) => {
                  const without = prev.filter((chat) => chat.id !== data.conversation.id);
                  return [data.conversation, ...without];
                });
                setMessagesByChat((prev) => {
                  const { [optimisticChatId]: _drop, ...rest } = prev;
                  const previousMessages = targetChatId ? prev[targetChatId] ?? [] : [];
                  const cleanedPrevious = previousMessages.filter(
                    (message) => !message.id.startsWith("temp-user-") && message.id !== STREAM_ASSISTANT_ID
                  );

                  return {
                    ...rest,
                    [data.conversation.id]: [
                      ...cleanedPrevious,
                      confirmedUserMessage!,
                      { ...streamingAssistantMessage, content: streamedText },
                    ],
                  };
                });
                setActiveChatId(data.conversation.id);
                continue;
              }

              if (parsed.event === "delta") {
                const delta = parsed.data as { text: string };
                streamedText += delta.text;

                setMessagesByChat((prev) => ({
                  ...prev,
                  [confirmedChatId]: replaceMessage(
                    prev[confirmedChatId] ?? [],
                    STREAM_ASSISTANT_ID,
                    { ...streamingAssistantMessage, content: streamedText }
                  ),
                }));
                continue;
              }

              if (parsed.event === "done") {
                const data = parsed.data as StreamDone;
                const finalAssistantMessage = toMessage(data.assistantMessage);

                setChats((prev) => {
                  const without = prev.filter((chat) => chat.id !== data.conversation.id);
                  return [data.conversation, ...without];
                });
                setMessagesByChat((prev) => {
                  const existing = prev[data.conversation.id] ?? [];
                  const withoutStreaming = existing.filter(
                    (message) => message.id !== STREAM_ASSISTANT_ID
                  );
                  const withConfirmedUser = confirmedUserMessage
                    ? uniqueById([...withoutStreaming, confirmedUserMessage])
                    : withoutStreaming;

                  return {
                    ...prev,
                    [data.conversation.id]: uniqueById([
                      ...withConfirmedUser,
                      finalAssistantMessage,
                    ]),
                  };
                });
                setActiveChatId(data.conversation.id);
                continue;
              }

              if (parsed.event === "error") {
                const data = parsed.data as { error: string };
                throw new Error(data.error);
              }
            }
          }
        } catch (error) {
          if ((error as Error).name !== "AbortError") {
            console.error("Failed to send message", error);
            setMessagesByChat((prev) => ({
              ...prev,
              [confirmedChatId]: replaceMessage(
                prev[confirmedChatId] ?? prev[optimisticChatId] ?? [],
                STREAM_ASSISTANT_ID,
                {
                  id: `error-${nextId()}`,
                  role: "assistant",
                  content: `Maaf, gagal mengirim pesan: ${(error as Error).message}`,
                }
              ),
            }));
          }
        } finally {
          setIsStreaming(false);
          abortRef.current = null;
        }
      })();
    },
    [activeChatId, isStreaming]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const copyMessage = useCallback((id: string, content: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(content);
    }
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), COPY_FEEDBACK_MS);
  }, []);

  const rateMessage = useCallback((id: string, value: FeedbackValue) => {
    setFeedback((prev) => ({ ...prev, [id]: prev[id] === value ? null : value }));
  }, []);

  return {
    chats,
    activeChatId,
    messages: activeMessages,
    isLoadingConversations,
    isStreaming,
    promptSeed,
    copiedId,
    feedback,
    selectChat,
    createChat,
    deleteChat,
    sendMessage,
    stopStreaming,
    copyMessage,
    rateMessage,
  };
}
