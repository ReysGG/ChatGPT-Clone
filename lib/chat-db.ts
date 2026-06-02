import "server-only";
import { prisma } from "@/lib/prisma";

export const DEFAULT_USER_EMAIL = process.env.APP_USER_EMAIL ?? "david@example.com";
export const DEFAULT_USER_NAME = process.env.APP_USER_NAME ?? "David";

export async function getOrCreateDefaultUser() {
  return prisma.user.upsert({
    where: { email: DEFAULT_USER_EMAIL },
    update: {},
    create: {
      email: DEFAULT_USER_EMAIL,
      name: DEFAULT_USER_NAME,
      settings: {
        create: {
          defaultModel: "gemini-2.5-flash",
          systemPrompt: "You are a helpful personal AI assistant.",
          temperature: 0.7,
          darkMode: true,
        },
      },
    },
  });
}

export function createTitleFromMessage(message: string): string {
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Percakapan baru";
  return cleaned.length > 48 ? `${cleaned.slice(0, 48)}…` : cleaned;
}

export function serializeConversation(conversation: {
  id: string;
  title: string;
  updatedAt: Date;
  createdAt: Date;
}) {
  return {
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
    createdAt: conversation.createdAt.toISOString(),
  };
}

export function serializeMessage(message: {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function assertConversationOwner(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });

  if (!conversation) {
    throw new Error("CONVERSATION_NOT_FOUND");
  }

  return conversation;
}
