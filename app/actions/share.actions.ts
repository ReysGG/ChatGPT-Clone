"use server";

import { prisma } from "@/lib/prisma";
import { SharedConversation } from "@/types/share.types";

export async function getSharedConversation(shareId: string): Promise<SharedConversation | null> {
  // Execute independent queries in parallel to avoid N+1 / sequential delays
  const [globalSettings, conversation] = await Promise.all([
    prisma.appSetting.findFirst(),
    prisma.conversation.findUnique({
      where: { shareId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
        user: {
          select: { name: true },
        },
      },
    }),
  ]);

  if (globalSettings && !globalSettings.sharingEnabled) {
    return null;
  }

  if (!conversation || !conversation.isShared) {
    return null;
  }

  return conversation as SharedConversation;
}
