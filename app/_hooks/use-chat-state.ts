"use client";

import { useCallback, useState } from "react";
import {
  INITIAL_CHATS,
  INITIAL_MESSAGES,
} from "../_constants/initial-data";
import type { ChatItem } from "../_components/sidebar/types";
import type { FeedbackValue, Message } from "../_components/chat/types";
import type { UploadedFile } from "../_components/chat-input/types";

const COPY_FEEDBACK_MS = 1_500;
const FAKE_STREAM_DELAY_MS = 1_200;

const FALLBACK_REPLIES = [
  "Tentu! Untuk MVP fokus ke chat streaming, history tersimpan, sidebar list, dan dark mode.\nTambah edit/regenerate belakangan.",
  "Oke, mari kita breakdown step-by-stepnya.",
  "Coba kita kelompokkan menjadi tiga task utama.",
];

const nextId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random()}`;

export interface UseChatState {
  chats: ChatItem[];
  activeChatId: string | null;
  messages: Message[];
  isStreaming: boolean;
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
  const [chats, setChats] = useState<ChatItem[]>(INITIAL_CHATS);
  const [activeChatId, setActiveChatId] = useState<string | null>(
    INITIAL_CHATS[0]?.id ?? null
  );
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>(
    INITIAL_MESSAGES
  );
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, FeedbackValue | null>>({});
  const [streamTimer, setStreamTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const activeMessages = activeChatId ? messagesByChat[activeChatId] ?? [] : [];

  const selectChat = useCallback((id: string) => {
    setActiveChatId(id);
  }, []);

  const createChat = useCallback(() => {
    const id = nextId();
    const newChat: ChatItem = {
      id,
      title: "Percakapan baru",
      updatedAt: new Date().toISOString(),
    };
    setChats((prev) => [newChat, ...prev]);
    setMessagesByChat((prev) => ({ ...prev, [id]: [] }));
    setActiveChatId(id);
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      setChats((prev) => {
        const next = prev.filter((c) => c.id !== id);
        setActiveChatId((cur) => (cur === id ? next[0]?.id ?? null : cur));
        return next;
      });
      setMessagesByChat((prev) => {
        const { [id]: _drop, ...rest } = prev;
        return rest;
      });
    },
    []
  );

  const appendMessage = useCallback(
    (chatId: string, msg: Message) => {
      setMessagesByChat((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] ?? []), msg],
      }));
    },
    []
  );

  const sendMessage = useCallback(
    (text: string, files: UploadedFile[]) => {
      if (!activeChatId) return;
      const userMsg: Message = {
        id: nextId(),
        role: "user",
        content: text,
        files: files.length > 0 ? files : undefined,
      };
      appendMessage(activeChatId, userMsg);

      // Update chat title to first message preview
      setChats((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? { ...c, title: text.slice(0, 40) || c.title, updatedAt: new Date().toISOString() }
            : c
        )
      );

      setIsStreaming(true);
      const reply = FALLBACK_REPLIES[Math.floor(Math.random() * FALLBACK_REPLIES.length)] ?? "";
      const timer = setTimeout(() => {
        appendMessage(activeChatId, {
          id: nextId(),
          role: "assistant",
          content: reply,
        });
        setIsStreaming(false);
        setStreamTimer(null);
      }, FAKE_STREAM_DELAY_MS);
      setStreamTimer(timer);
    },
    [activeChatId, appendMessage]
  );

  const stopStreaming = useCallback(() => {
    if (streamTimer) {
      clearTimeout(streamTimer);
      setStreamTimer(null);
    }
    setIsStreaming(false);
  }, [streamTimer]);

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
    isStreaming,
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
