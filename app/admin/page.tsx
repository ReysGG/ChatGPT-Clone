import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_MODEL } from "@/lib/ai";
import { AdminSettingsForm } from "./_components/admin-settings-form";

export const dynamic = "force-dynamic";

export default async function AdminPage(): Promise<React.ReactElement> {
  try {
    await requireAdmin();
  } catch {
    redirect("/");
  }

  const [users, conversations, messages, settings, recentConversations] = await Promise.all([
    prisma.user.count(),
    prisma.conversation.count(),
    prisma.message.count(),
    prisma.setting.findFirst(),
    prisma.conversation.findMany({ orderBy: { updatedAt: "desc" }, take: 8, include: { user: true } }),
  ]);
  const currentSettings = {
    defaultModel: settings?.defaultModel || DEFAULT_MODEL,
    systemPrompt: settings?.systemPrompt || "You are a helpful personal AI assistant.",
    temperature: settings?.temperature ?? 0.7,
  };

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-neutral-200 bg-white p-5">
          <h1 className="text-lg font-semibold">AI Chat Admin</h1>
          <p className="mt-1 text-sm text-neutral-500">Control panel MVP</p>
          <nav className="mt-6 space-y-2 text-sm">
            <a className="block rounded-md bg-indigo-50 px-3 py-2 font-medium text-indigo-700" href="#dashboard">Dashboard</a>
            <a className="block rounded-md px-3 py-2 text-neutral-700 hover:bg-neutral-100" href="#settings">App Settings</a>
            <a className="block rounded-md px-3 py-2 text-neutral-700 hover:bg-neutral-100" href="#conversations">Conversations</a>
            <a className="block rounded-md px-3 py-2 text-neutral-700 hover:bg-neutral-100" href="#maintenance">Maintenance</a>
          </nav>
          <Link className="mt-6 block rounded-md border border-neutral-200 px-3 py-2 text-center text-sm" href="/">Back to chat</Link>
        </aside>

        <section className="flex-1 p-6">
          <div id="dashboard" className="rounded-md border border-neutral-200 bg-white p-5 shadow-none">
            <p className="text-sm font-medium text-indigo-600">Dashboard</p>
            <h2 className="mt-1 text-2xl font-semibold">System overview</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <Stat label="Users" value={users} />
              <Stat label="Conversations" value={conversations} />
              <Stat label="Messages" value={messages} />
              <Stat label="Default model" value={currentSettings.defaultModel} />
            </div>
          </div>

          <div id="settings" className="mt-6 rounded-md border border-neutral-200 bg-white p-5 shadow-none">
            <p className="text-sm font-medium text-indigo-600">App Settings</p>
            <h2 className="mt-1 text-xl font-semibold">Edit defaults</h2>
            <dl className="mt-4 grid gap-4 md:grid-cols-3">
              <Info label="Model" value={currentSettings.defaultModel} />
              <Info label="Temperature" value={String(currentSettings.temperature)} />
              <Info label="Guest mode" value="Enabled: view only, send blocked" />
            </dl>
            <AdminSettingsForm initialSettings={currentSettings} />
          </div>

          <div id="conversations" className="mt-6 rounded-md border border-neutral-200 bg-white p-5 shadow-none">
            <p className="text-sm font-medium text-indigo-600">Conversations</p>
            <h2 className="mt-1 text-xl font-semibold">Recent chats</h2>
            <div className="mt-4 overflow-hidden rounded-md border border-neutral-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {recentConversations.map((conversation) => (
                    <tr key={conversation.id}>
                      <td className="px-3 py-2 font-medium">{conversation.title}</td>
                      <td className="px-3 py-2 text-neutral-600">{conversation.user.email}</td>
                      <td className="px-3 py-2 text-neutral-600">{conversation.updatedAt.toLocaleString("id-ID")}</td>
                    </tr>
                  ))}
                  {recentConversations.length === 0 && (
                    <tr><td className="px-3 py-4 text-neutral-500" colSpan={3}>No conversations.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div id="maintenance" className="mt-6 rounded-md border border-neutral-200 bg-white p-5 shadow-none">
            <p className="text-sm font-medium text-indigo-600">Maintenance</p>
            <h2 className="mt-1 text-xl font-semibold">Health</h2>
            <p className="mt-2 text-sm text-neutral-600">Use <code className="rounded bg-neutral-100 px-1">/api/health</code> for DB + Gemini smoke test.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }): React.ReactElement {
  return <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4"><p className="text-sm text-neutral-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function Info({ label, value }: { label: string; value: string }): React.ReactElement {
  return <div><dt className="text-sm text-neutral-500">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>;
}
