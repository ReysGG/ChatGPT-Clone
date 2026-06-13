import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminDashboardClient } from "./_components/admin-dashboard-client";
import { getAdminDashboardData } from "../actions/admin.actions";
import {
  serializeAdminUsers,
  serializeAdminConversations,
  buildUsageStats,
} from "../services/admin.service";
import type { AdminSettings } from "@/types/admin.types";

export const dynamic = "force-dynamic";

export default async function AdminPage(): Promise<React.ReactElement> {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    redirect("/");
  }

  const adminEmail = session.email || "";

  // Fetch data using the server action
  const data = await getAdminDashboardData();

  // Serialize and format data using the service layer
  const serializedUsers = serializeAdminUsers(data.users);
  const serializedConversations = serializeAdminConversations(data.conversations);
  const usageStats = buildUsageStats(data.usage);

  const adminSettings: AdminSettings = {
    defaultModel: data.currentSettings.defaultModel,
    defaultSystemPrompt: data.currentSettings.defaultSystemPrompt,
    defaultTemperature: data.currentSettings.defaultTemperature,
    registrationEnabled: data.currentSettings.registrationEnabled,
    sharingEnabled: data.currentSettings.sharingEnabled,
    maxMessagesPerChat: data.currentSettings.maxMessagesPerChat,
    maxPromptLength: data.currentSettings.maxPromptLength,
    maxMessagesPerUserPerDay: data.currentSettings.maxMessagesPerUserPerDay ?? 50,
    rateLimitMessagesPerMinute: data.currentSettings.rateLimitMessagesPerMinute ?? 10,
    toolsEnabled: data.currentSettings.toolsEnabled ?? true,
    imageToolEnabled: data.currentSettings.imageToolEnabled ?? true,
    knowledgeToolEnabled: data.currentSettings.knowledgeToolEnabled ?? true,
    memoryToolEnabled: data.currentSettings.memoryToolEnabled ?? true,
    guardrailsEnabled: data.currentSettings.guardrailsEnabled ?? true,
    blockedKeywords: data.currentSettings.blockedKeywords ?? null,
    maxToolCallsPerMessage: data.currentSettings.maxToolCallsPerMessage ?? 4,
  };

  return (
    <AdminDashboardClient
      initialUsers={serializedUsers}
      initialConversations={serializedConversations}
      initialSettings={adminSettings}
      stats={data.stats}
      usageStats={usageStats}
      adminEmail={adminEmail}
    />
  );
}
