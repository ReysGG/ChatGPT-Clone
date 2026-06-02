import type { ChatItem } from "../_components/sidebar/types";
import type { Message } from "../_components/chat/types";

/* -------------------------------------------------------------------------- */
/*  Seed data — used only by the demo state hook.                              */
/*  When a real API is wired in, replace INITIAL_CHATS / INITIAL_MESSAGES      */
/*  with the fetch result and delete this file.                                 */
/* -------------------------------------------------------------------------- */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const INITIAL_CHATS: ChatItem[] = [
  { id: "1", title: "Brainstorm fitur MVP", updatedAt: new Date().toISOString() },
  { id: "2", title: "Refactor auth flow", updatedAt: new Date(Date.now() - HOUR_MS).toISOString() },
  { id: "3", title: "Setup Prisma di Next.js", updatedAt: new Date(Date.now() - DAY_MS).toISOString() },
];

export const INITIAL_MESSAGES: Record<string, Message[]> = {
  "1": [
    {
      id: "m1",
      role: "user",
      content: "Bantu brainstorm fitur MVP untuk AI chat app.",
      createdAt: "11:32 AM",
    },
    {
      id: "m2",
      role: "assistant",
      content:
        "Tentu! Untuk MVP fokus ke chat streaming, history tersimpan, sidebar list, dan dark mode.\nTambah edit/regenerate belakangan.",
      createdAt: "11:33 AM",
    },
  ],
  "2": [{ id: "m3", role: "user", content: "Cari pola auth yang aman untuk Next.js 15." }],
  "3": [],
};

/* Default model + brand shown in the chat header. */
export const DEFAULT_MODEL_NAME = "Gemini 2.5 Flash";
