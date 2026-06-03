export interface SerializedUser {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  conversationCount: number;
  messageCount: number;
  sessionCount: number;
}

export interface SerializedConversation {
  id: string;
  title: string;
  userEmail: string;
  userName: string | null;
  messageCount: number;
  isShared: boolean;
  shareId: string | null;
  sharedAt: string | null;
  updatedAt: string;
}

export interface SerializedUsageEvent {
  id: string;
  userId: string;
  conversationId: string | null;
  type: string;
  provider: string | null;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
}

export interface UsageStats {
  todayEvents: SerializedUsageEvent[];
  todayTokens: {
    input: number;
    output: number;
    total: number;
  };
  allTimeTokens: {
    input: number;
    output: number;
    total: number;
  };
  byUserToday: Array<{
    userId: string;
    messageCount: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  }>;
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalSharedConversations: number;
  activeSessions: number;
  conversationsCreatedToday: number;
  messagesCreatedToday: number;
}

export interface AdminSettings {
  defaultModel: string;
  defaultSystemPrompt: string;
  defaultTemperature: number;
  registrationEnabled: boolean;
  sharingEnabled: boolean;
  maxMessagesPerChat: number;
  maxPromptLength: number;
  maxMessagesPerUserPerDay: number;
  rateLimitMessagesPerMinute: number;
}

export interface AdminDashboardDataResponse {
  users: Array<{
    id: string;
    name: string | null;
    email: string;
    createdAt: Date;
    conversations: { _count?: { messages: number } }[];
    _count?: { sessions: number; conversations: number };
  }>;
  conversations: Array<{
    id: string;
    title: string;
    user?: { email: string; name: string | null } | null;
    _count?: { messages: number };
    isShared: boolean;
    shareId: string | null;
    sharedAt: Date | null;
    updatedAt: Date;
  }>;
  currentSettings: AdminSettings;
  stats: AdminDashboardStats;
  usage: {
    usageEventsToday: Array<{
      id: string;
      userId: string;
      conversationId: string | null;
      type: string;
      provider: string | null;
      model: string | null;
      inputTokens: number | null;
      outputTokens: number | null;
      createdAt: Date;
    }>;
    tokenUsageToday: { _sum: { inputTokens: number | null; outputTokens: number | null } } | null;
    tokenUsageAllTime: { _sum: { inputTokens: number | null; outputTokens: number | null } } | null;
    tokenUsageByUserToday: Array<{ userId: string; _count?: { id: number }; _sum?: { inputTokens: number | null; outputTokens: number | null } }>;
  };
}
