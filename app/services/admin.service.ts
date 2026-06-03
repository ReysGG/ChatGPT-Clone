import {
  SerializedUser,
  SerializedConversation,
  UsageStats,
} from "@/types/admin.types";

export function serializeAdminUsers(users: {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
  conversations: { _count?: { messages: number } }[];
  _count?: { sessions: number; conversations: number };
}[]): SerializedUser[] {
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.createdAt.toISOString(),
    conversationCount: u._count?.conversations ?? 0,
    messageCount: u.conversations.reduce(
      (sum: number, c) => sum + (c._count?.messages ?? 0),
      0
    ),
    sessionCount: u._count?.sessions ?? 0,
  }));
}

export function serializeAdminConversations(
  conversations: {
    id: string;
    title: string;
    user?: { email: string; name: string | null } | null;
    _count?: { messages: number };
    isShared: boolean;
    shareId: string | null;
    sharedAt: Date | null;
    updatedAt: Date;
  }[]
): SerializedConversation[] {
  return conversations.map((c) => ({
    id: c.id,
    title: c.title,
    userEmail: c.user?.email || "Unknown",
    userName: c.user?.name || "Unknown",
    messageCount: c._count?.messages ?? 0,
    isShared: c.isShared,
    shareId: c.shareId,
    sharedAt: c.sharedAt ? c.sharedAt.toISOString() : null,
    updatedAt: c.updatedAt.toISOString(),
  }));
}

export function buildUsageStats(usageData: {
  usageEventsToday: {
    id: string;
    userId: string;
    conversationId: string | null;
    type: string;
    provider: string | null;
    model: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    createdAt: Date;
  }[];
  tokenUsageToday: { _sum: { inputTokens: number | null; outputTokens: number | null } } | null;
  tokenUsageAllTime: { _sum: { inputTokens: number | null; outputTokens: number | null } } | null;
  tokenUsageByUserToday: {
    userId: string;
    _count?: { id: number };
    _sum?: { inputTokens: number | null; outputTokens: number | null };
  }[];
}): UsageStats {
  const {
    usageEventsToday,
    tokenUsageToday,
    tokenUsageAllTime,
    tokenUsageByUserToday,
  } = usageData;

  const serializedUsageEvents = usageEventsToday.map((event) => ({
    id: event.id,
    userId: event.userId,
    conversationId: event.conversationId,
    type: event.type,
    provider: event.provider,
    model: event.model,
    inputTokens: event.inputTokens ?? 0,
    outputTokens: event.outputTokens ?? 0,
    createdAt: event.createdAt.toISOString(),
  }));

  return {
    todayEvents: serializedUsageEvents,
    todayTokens: {
      input: tokenUsageToday?._sum?.inputTokens ?? 0,
      output: tokenUsageToday?._sum?.outputTokens ?? 0,
      total:
        (tokenUsageToday?._sum?.inputTokens ?? 0) +
        (tokenUsageToday?._sum?.outputTokens ?? 0),
    },
    allTimeTokens: {
      input: tokenUsageAllTime?._sum?.inputTokens ?? 0,
      output: tokenUsageAllTime?._sum?.outputTokens ?? 0,
      total:
        (tokenUsageAllTime?._sum?.inputTokens ?? 0) +
        (tokenUsageAllTime?._sum?.outputTokens ?? 0),
    },
    byUserToday: tokenUsageByUserToday.map((item) => ({
      userId: item.userId,
      messageCount: item._count?.id ?? 0,
      inputTokens: item._sum?.inputTokens ?? 0,
      outputTokens: item._sum?.outputTokens ?? 0,
      totalTokens:
        (item._sum?.inputTokens ?? 0) + (item._sum?.outputTokens ?? 0),
    })),
  };
}
