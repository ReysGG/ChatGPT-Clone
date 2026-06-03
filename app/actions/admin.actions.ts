"use server";

import { prisma } from "@/lib/prisma";
import { ADMIN_CONSTANTS } from "@/constants/admin.constants";
import { AdminDashboardDataResponse } from "@/types/admin.types";

export async function getAdminDashboardData(): Promise<AdminDashboardDataResponse> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    users,
    totalUsers,
    conversations,
    totalConversations,
    appSettings,
    totalMessages,
    totalSharedConversations,
    activeSessions,
    conversationsCreatedToday,
    messagesCreatedToday,
  ] = await prisma.$transaction([
    prisma.user.findMany({
      skip: 0,
      take: 100,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        conversations: {
          select: {
            _count: {
              select: { messages: true },
            },
          },
        },
        _count: {
          select: {
            sessions: true,
            conversations: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
    prisma.conversation.findMany({
      skip: 0,
      take: 100,
      select: {
        id: true,
        title: true,
        isShared: true,
        shareId: true,
        sharedAt: true,
        updatedAt: true,
        user: {
          select: { name: true, email: true },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.conversation.count(),
    prisma.appSetting.findFirst(),
    prisma.message.count(),
    prisma.conversation.count({ where: { isShared: true } }),
    prisma.session.count({ where: { expiresAt: { gte: new Date() } } }),
    prisma.conversation.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.message.count({ where: { createdAt: { gte: startOfToday } } }),
  ]);

  let currentSettings = appSettings;
  if (!currentSettings) {
    currentSettings = await prisma.appSetting.create({
      data: {
        id: "global",
        defaultModel: ADMIN_CONSTANTS.DEFAULT_MODEL,
        defaultSystemPrompt: ADMIN_CONSTANTS.DEFAULT_SYSTEM_PROMPT,
        defaultTemperature: ADMIN_CONSTANTS.DEFAULT_TEMPERATURE,
        registrationEnabled: true,
        sharingEnabled: true,
        maxMessagesPerChat: ADMIN_CONSTANTS.MAX_MESSAGES_PER_CHAT,
        maxPromptLength: ADMIN_CONSTANTS.MAX_PROMPT_LENGTH,
        maxMessagesPerUserPerDay: ADMIN_CONSTANTS.MAX_MESSAGES_PER_USER_PER_DAY,
        rateLimitMessagesPerMinute: ADMIN_CONSTANTS.RATE_LIMIT_MESSAGES_PER_MINUTE,
      },
    });
  }

  const [
    usageEventsToday,
    tokenUsageToday,
    tokenUsageAllTime,
    tokenUsageByUserToday,
  ] = await prisma.$transaction([
    prisma.usageEvent.findMany({
      skip: 0,
      take: 100,
      select: {
        id: true,
        userId: true,
        conversationId: true,
        type: true,
        provider: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        createdAt: true,
      },
      where: { createdAt: { gte: startOfToday } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.usageEvent.aggregate({
      _sum: {
        inputTokens: true,
        outputTokens: true,
      },
      where: { createdAt: { gte: startOfToday } },
    }),
    prisma.usageEvent.aggregate({
      _sum: {
        inputTokens: true,
        outputTokens: true,
      },
    }),
    prisma.usageEvent.groupBy({
      by: ["userId"],
      _count: {
        id: true,
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
      },
      where: { createdAt: { gte: startOfToday } },
      orderBy: { userId: "asc" },
    }),
  ]);

  return {
    users,
    conversations,
    currentSettings,
    stats: {
      totalUsers,
      totalConversations,
      totalMessages,
      totalSharedConversations,
      activeSessions,
      conversationsCreatedToday,
      messagesCreatedToday,
    },
    usage: {
      usageEventsToday,
      tokenUsageToday,
      tokenUsageAllTime,
      tokenUsageByUserToday: tokenUsageByUserToday as AdminDashboardDataResponse["usage"]["tokenUsageByUserToday"],
    },
  };
}
