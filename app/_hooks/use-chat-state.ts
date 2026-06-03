"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatItem } from "../_components/sidebar/types";
import type { FeedbackValue, Message } from "../_components/chat/types";
import type { UploadedFile } from "../_components/chat-input/types";
import type { ChatSettings } from "../_components/settings-modal";

const COPY_FEEDBACK_MS = 1_500;
const STREAM_ASSISTANT_ID = "streaming-assistant";

const DEFAULT_SETTINGS: ChatSettings = {
  defaultModel: "gemini-2.5-flash-lite",
  systemPrompt: "You are a helpful personal AI assistant.",
  temperature: 0.7,
};

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
  settings: ChatSettings;
  isSavingSettings: boolean;
  session: AuthSession;
  isAuthLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  selectChat: (id: string) => void;
  createChat: () => void;
  deleteChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  sendMessage: (text: string, files: UploadedFile[]) => void;
  stopStreaming: () => void;
  copyMessage: (id: string, content: string) => void;
  rateMessage: (id: string, value: FeedbackValue) => void;
  saveSettings: (settings: ChatSettings) => Promise<void>;
  clearChats: () => void;
  shareChat: (id: string, isShared: boolean) => Promise<ChatItem | void>;
  login: (credentials: { email: string; password: string }) => Promise<AuthSession | void>;
  logout: () => void;
}

export interface AuthSession {
  role: "guest" | "user" | "admin";
  isAuthenticated: boolean;
  userId?: string;
  email?: string;
  name?: string;
  image?: string | null;
}

export function useChatState(): UseChatState {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({});
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, FeedbackValue | null>>({});
  const [settings, setSettings] = useState<ChatSettings>(DEFAULT_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [session, setSession] = useState<AuthSession>({ role: "guest", isAuthenticated: false });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
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

  const loadConversations = useCallback(async () => {
    const data = await fetchJson<{ conversations: ApiConversation[] }>(
      "/api/conversations"
    );
    setChats(data.conversations);
    const firstId = data.conversations[0]?.id ?? null;
    setActiveChatId(firstId);
    setMessagesByChat({});
    if (firstId) {
      await loadMessages(firstId);
    }
  }, [loadMessages]);

  const loadSettings = useCallback(async () => {
    const data = await fetchJson<{ settings: ChatSettings }>("/api/settings");
    setSettings(data.settings);
  }, []);

  useEffect(() => {
    if (activeChatId && !messagesByChat[activeChatId]) {
      void loadMessages(activeChatId);
    }
  }, [activeChatId, loadMessages, messagesByChat]);


  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await loadConversations();
      } catch (error) {
        console.error("Failed to load conversations", error);
      } finally {
        if (!cancelled) {
          setIsLoadingConversations(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadConversations]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await loadSettings();
      } catch (error) {
        console.error("Failed to load settings", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadSettings]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const data = await fetchJson<{ session: AuthSession }>("/api/auth/session");
        if (cancelled) return;

        setSession(data.session);
        if (data.session.isAuthenticated) {
          await Promise.all([loadConversations(), loadSettings()]);
        }
      } catch (error) {
        console.error("Failed to load session", error);
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [loadConversations, loadSettings]);

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
      if (!session.isAuthenticated) {
        setAuthError("Login diperlukan untuk mengirim pesan.");
        window.dispatchEvent(new CustomEvent("ai-chat-login-required", {
          detail: { text, files },
        }));
        return;
      }

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
              model: settings.defaultModel,
              systemPrompt: settings.systemPrompt,
              temperature: settings.temperature,
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
                  content: `Maaf, ${(error as Error).message}`,
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
    [activeChatId, isStreaming, settings, session.isAuthenticated]
  );


  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const copyMessage = useCallback((id: string, content: string) => {
    void (async () => {
      try {
        await navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (error) {
        console.error("Failed to copy message", error);
      }
    })();
  }, []);

  const rateMessage = useCallback((id: string, value: FeedbackValue) => {
    setFeedback((prev) => ({
      ...prev,
      [id]: prev[id] === value ? null : value,
    }));
  }, []);

  const saveSettings = useCallback(async (nextSettings: ChatSettings): Promise<void> => {
    setIsSavingSettings(true);
    try {
      const data = await fetchJson<{ settings: ChatSettings }>("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings),
      });
      setSettings(data.settings);
    } catch (error) {
      console.error("Failed to save settings", error);
      throw error;
    } finally {
      setIsSavingSettings(false);
    }
  }, []);

  const renameChat = useCallback((id: string, newTitle: string) => {
    void (async () => {
      try {
        const data = await fetchJson<{ conversation: ApiConversation }>(
          `/api/conversations/${id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: newTitle }),
          }
        );
        setChats((prev) =>
          prev.map((chat) => (chat.id === id ? { ...chat, title: data.conversation.title } : chat))
        );
      } catch (error) {
        console.error("Failed to rename chat", error);
      }
    })();
  }, []);


  const clearChats = useCallback(() => {
    void (async () => {
      await fetchJson<{ ok: boolean }>("/api/conversations", { method: "DELETE" });
      setChats([]);
      setActiveChatId(null);
      setPromptSeed((prev) => prev + 1);
    })();
  }, [loadConversations, loadSettings]);

  const shareChat = useCallback(async (id: string, isShared: boolean) => {
    if (!session.isAuthenticated) {
      setAuthError("Login diperlukan untuk share chat.");
      window.dispatchEvent(new CustomEvent("ai-chat-login-required"));
      return;
    }

    const data = await fetchJson<{ conversation: ApiConversation }>(
      `/api/conversations/${id}/share`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isShared }),
      }
    );

    setChats((prev) => prev.map((chat) => (
      chat.id === data.conversation.id ? { ...chat, ...data.conversation } : chat
    )));

    return data.conversation;
  }, [session.isAuthenticated]);

  const login = useCallback(async (credentials: { email: string; password: string }): Promise<AuthSession | void> => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const data = await fetchJson<{ session: AuthSession }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      setSession(data.session);
      if (data.session.isAuthenticated) {
        await Promise.all([loadConversations(), loadSettings()]);
      }
      return data.session;
    } catch (error) {
      setAuthError((error as Error).message);
    } finally {
      setIsAuthLoading(false);
    }
  }, [loadConversations, loadSettings]);

  const logout = useCallback(() => {
    void (async () => {
      const data = await fetchJson<{ session: AuthSession }>("/api/auth/logout", { method: "POST" });
      setSession(data.session);
      setChats([]);
      setMessagesByChat({});
      setActiveChatId(null);
      setPromptSeed((prev) => prev + 1);
      void loadSettings();
    })();
  }, [loadSettings]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
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
    settings,
    isSavingSettings,
    session,
    isAuthLoading,
    authError,
    clearAuthError,
    selectChat,
    createChat,
    deleteChat,
    renameChat,
    sendMessage,
    stopStreaming,
    copyMessage,
    rateMessage,
    saveSettings,
    clearChats,
    shareChat,
    login,
    logout,
  };
}
