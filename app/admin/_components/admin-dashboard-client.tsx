"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Settings,
  Activity,
  LogOut,
  MessageSquare,
  Share2,
  Trash2,
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Search,
  ArrowLeft,
  Server,
  Database,
  BarChart3,
  Clock
} from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";
import { getModelLabel } from "@/app/_components/settings-modal";

const MODEL_OPTIONS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
];

import {
  SerializedUser,
  SerializedConversation,
  AdminSettings,
  AdminDashboardStats,
  UsageStats,
} from "@/types/admin.types";

interface AdminDashboardClientProps {
  initialUsers: SerializedUser[];
  initialConversations: SerializedConversation[];
  initialSettings: AdminSettings;
  stats: AdminDashboardStats;
  usageStats: UsageStats;
  adminEmail: string;
}

export function AdminDashboardClient({
  initialUsers,
  initialConversations,
  initialSettings,
  stats,
  usageStats,
  adminEmail,
}: AdminDashboardClientProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  
  // Users state
  const [users, setUsers] = useState<SerializedUser[]>(initialUsers);
  const [userSearch, setUserSearch] = useState("");
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  // Conversations state
  const [conversations, setConversations] = useState<SerializedConversation[]>(initialConversations);
  const [convoSearch, setConvoSearch] = useState("");
  const [actionConvoId, setActionConvoId] = useState<string | null>(null);

  // Settings form state
  const [settings, setSettings] = useState(initialSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Health checks state
  const [healthData, setHealthData] = useState<{ latencyMs?: number; configured?: boolean; status?: string; environment?: string; database?: { latencyMs: number }; gemini?: { configured: boolean }; [key: string]: unknown } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Admin Activity logs state
  type AdminActivity = {
    id: string;
    type: string;
    createdAt: string | Date;
    userId?: string;
    userName?: string;
    userEmail?: string;
    metadata?: Record<string, unknown>;
  };

  const [adminActivities, setAdminActivities] = useState<AdminActivity[]>([]);
  const [loadingAdminActivities, setLoadingAdminActivities] = useState(false);
  const [adminActivityError, setAdminActivityError] = useState<string | null>(null);
  const [adminActivitySearch, setAdminActivitySearch] = useState("");

  // Fetch health data on mount
  useEffect(() => {
    fetchHealth();
  }, []);

  // Fetch admin activities on activeTab change
  useEffect(() => {
    if (activeTab === "activity") {
      fetchAdminActivities();
    }
  }, [activeTab]);

  async function fetchAdminActivities() {
    setLoadingAdminActivities(true);
    setAdminActivityError(null);
    try {
      const res = await fetch("/api/admin/activity");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat log aktivitas");
      setAdminActivities(data.activities || []);
    } catch (err) {
      setAdminActivityError((err as Error).message || "Gagal memuat log aktivitas");
    } finally {
      setLoadingAdminActivities(false);
    }
  }

  async function fetchHealth() {
    setIsCheckingHealth(true);
    setHealthError(null);
    try {
      const res = await fetch("/api/admin/health");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch health data");
      setHealthData(data);
    } catch (err) {
      setHealthError((err as Error).message || "Failed to connect to health API");
    } finally {
      setIsCheckingHealth(false);
    }
  }

  // Force Logout handler
  async function handleForceLogout(userId: string) {
    if (!confirm("Apakah Anda yakin ingin mengeluarkan paksa user ini dari semua perangkat?")) return;
    setActionUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/logout`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal force logout");
      
      // Update sessionCount in local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, sessionCount: 0 } : u));
      alert("User berhasil di-force logout.");
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setActionUserId(null);
    }
  }

  // Delete User handler
  async function handleDeleteUser(userId: string) {
    if (!confirm("PERINGATAN: Menghapus user ini akan menghapus semua percakapan dan pesan mereka secara permanen! Apakah Anda yakin?")) return;
    setActionUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus user");
      
      // Remove from list
      setUsers(prev => prev.filter(u => u.id !== userId));
      alert("User berhasil dihapus.");
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setActionUserId(null);
    }
  }

  // Unshare Conversation handler
  async function handleUnshare(convoId: string) {
    if (!confirm("Apakah Anda yakin ingin membatalkan share link percakapan ini?")) return;
    setActionConvoId(convoId);
    try {
      const res = await fetch(`/api/admin/conversations/${convoId}/unshare`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membatalkan share");

      // Update in local state
      setConversations(prev => prev.map(c => c.id === convoId ? { ...c, isShared: false, shareId: null, sharedAt: null } : c));
      alert("Percakapan berhasil diubah kembali menjadi privat.");
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setActionConvoId(null);
    }
  }

  // Save Settings handler
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsStatus(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // API schema expects `systemPrompt` and `temperature`,
        // but local state uses the DB field names (`defaultSystemPrompt`, `defaultTemperature`).
        body: JSON.stringify({
          defaultModel: settings.defaultModel,
          systemPrompt: settings.defaultSystemPrompt,
          temperature: settings.defaultTemperature,
          registrationEnabled: settings.registrationEnabled,
          sharingEnabled: settings.sharingEnabled,
          maxMessagesPerChat: settings.maxMessagesPerChat,
          maxPromptLength: settings.maxPromptLength,
          maxMessagesPerUserPerDay: settings.maxMessagesPerUserPerDay,
          rateLimitMessagesPerMinute: settings.rateLimitMessagesPerMinute,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan setelan");
      
      setSettings(data.settings);
      setSettingsStatus({ type: "success", message: "Setelan global berhasil disimpan." });
    } catch (err) {
      setSettingsStatus({ type: "error", message: (err as Error).message || "Gagal menyimpan setelan." });
    } finally {
      setIsSavingSettings(false);
    }
  }

  // Filtering
  const filteredUsers = users.filter(u =>
    (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(convoSearch.toLowerCase()) ||
    c.userEmail.toLowerCase().includes(convoSearch.toLowerCase()) ||
    (c.userName || "").toLowerCase().includes(convoSearch.toLowerCase())
  );

  const filteredAdminActivities = adminActivities.filter(act => {
    const term = adminActivitySearch.toLowerCase();
    const typeLabel = act.type.toLowerCase();
    const userName = (act.userName || "").toLowerCase();
    const userEmail = (act.userEmail || "").toLowerCase();
    const detail = JSON.stringify(act.metadata || "").toLowerCase();
    return typeLabel.includes(term) || userName.includes(term) || userEmail.includes(term) || detail.includes(term);
  });

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-violet-500/30 selection:text-white">
      <div className="flex min-h-screen flex-col md:flex-row">
        
        {/* Sidebar */}
        <aside className="w-full border-b border-zinc-800 bg-zinc-900/40 p-6 md:w-72 md:border-b-0 md:border-r md:min-h-screen flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 shadow-[0_0_15px_rgba(124,58,237,0.5)]">
                <ShieldAlert className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold tracking-tight text-white text-base">Control Panel</h1>
                <p className="text-xs text-zinc-500 font-medium">Administrator Console</p>
              </div>
            </div>

            <nav className="mt-8 space-y-1">
              {[
                { id: "dashboard", label: "Dashboard", icon: Activity },
                { id: "users", label: "Manajemen User", icon: Users },
                { id: "audit", label: "Audit Percakapan", icon: MessageSquare },
                { id: "activity", label: "Log Aktivitas", icon: Clock },
                { id: "usage", label: "Statistik Penggunaan", icon: BarChart3 },
                { id: "settings", label: "Setelan Sistem", icon: Settings },
                { id: "maintenance", label: "Kesehatan & Latensi", icon: Server },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-violet-600/10 text-violet-400 border border-violet-500/20"
                        : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-8 pt-4 border-t border-zinc-800/80">
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-center text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>Kembali ke Chat</span>
            </Link>
          </div>
        </aside>

        {/* Content Area */}
        <section className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">

          {/* HEADER */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-violet-500 uppercase tracking-widest">
              System Admin
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-white capitalize sm:text-3xl">
              {activeTab === "audit" 
                ? "Audit Percakapan" 
                : activeTab === "settings" 
                  ? "Setelan Sistem" 
                  : activeTab === "maintenance" 
                    ? "Kesehatan & Latensi" 
                    : activeTab === "usage"
                      ? "Statistik Penggunaan"
                      : activeTab === "activity"
                        ? "Log Aktivitas Global"
                        : activeTab}
            </h2>
          </div>

          {/* TAB CONTENT: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              
              {/* Stats Card Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Pengguna" value={stats.totalUsers} icon={Users} desc="Terdaftar di database" />
                <StatCard title="Total Percakapan" value={stats.totalConversations} icon={MessageSquare} desc="Chat yang pernah dibuat" />
                <StatCard title="Total Pesan" value={stats.totalMessages} icon={MessageSquare} desc="Total dialog dengan AI" />
                <StatCard title="Sesi Aktif" value={stats.activeSessions} icon={LogOut} desc="User yang sedang login" />
              </div>

              {/* Dynamic Health & Daily Stats Cards */}
              <div className="grid gap-6 md:grid-cols-3">
                
                {/* Daily Activity */}
                <div className="md:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-md p-6 relative overflow-hidden">
                  <BorderBeam size={100} duration={8} borderWidth={1} colorFrom="#7c3aed" colorTo="#3b82f6" />
                  <h3 className="text-lg font-semibold text-white">Aktivitas Hari Ini</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Statistik pertumbuhan dalam 24 jam terakhir</p>
                  
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-lg p-4">
                      <span className="text-xs text-zinc-500 font-medium">Chat Baru Hari Ini</span>
                      <p className="text-2xl font-bold text-violet-400 mt-1">+{stats.conversationsCreatedToday}</p>
                    </div>
                    <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-lg p-4">
                      <span className="text-xs text-zinc-500 font-medium">Pesan Baru Hari Ini</span>
                      <p className="text-2xl font-bold text-blue-400 mt-1">+{stats.messagesCreatedToday}</p>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-zinc-500">
                    Sistem berbagi link: <span className="font-semibold text-emerald-400">{stats.totalSharedConversations} chat publik</span> telah diaktifkan.
                  </div>
                </div>

                {/* DB Health Status Card */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-md p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">Status Konektivitas</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Koneksi real-time provider data</p>
                    
                    <div className="mt-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-zinc-400" />
                          <span className="text-sm font-medium text-zinc-300">Database PG</span>
                        </div>
                        {healthData ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>{healthData.database?.latencyMs} ms</span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500">Checking...</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-zinc-400" />
                          <span className="text-sm font-medium text-zinc-300">Gemini Key</span>
                        </div>
                        {healthData ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            healthData.gemini?.configured ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                          }`}>
                            {healthData.gemini?.configured ? "Terkonfigurasi" : "Belum Set"}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">Checking...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={fetchHealth}
                    disabled={isCheckingHealth}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold py-2 text-zinc-300 transition-all"
                  >
                    <RefreshCw className={`h-3 w-3 ${isCheckingHealth ? "animate-spin" : ""}`} />
                    <span>Perbarui Status</span>
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* TAB CONTENT: USER MANAGEMENT */}
          {activeTab === "users" && (
            <div className="space-y-4">
              
              {/* Search Control */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Cari user berdasarkan nama atau email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-500"
                />
              </div>

              {/* Users Table */}
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/10 backdrop-blur-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="border-b border-zinc-800 bg-zinc-950/40 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Nama & Email</th>
                        <th className="px-4 py-3">Tanggal Daftar</th>
                        <th className="px-4 py-3 text-center">Chat / Pesan</th>
                        <th className="px-4 py-3 text-center">Sesi Aktif</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/10">
                      {filteredUsers.map(user => {
                        const isSelf = user.email.toLowerCase() === adminEmail.toLowerCase();
                        return (
                          <tr key={user.id} className="hover:bg-zinc-800/20 transition-colors">
                            <td className="px-4 py-3.5">
                              <div>
                                <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
                                  {user.name}
                                  {isSelf && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded">
                                      Admin
                                    </span>
                                  )}
                                </span>
                                <span className="block text-xs text-zinc-500 mt-0.5">{user.email}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-zinc-400 text-xs">
                              {new Date(user.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                            </td>
                            <td className="px-4 py-3.5 text-center text-xs font-semibold text-zinc-300">
                              {user.conversationCount} chat / {user.messageCount} pesan
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`inline-flex items-center justify-center h-6 px-2 text-xs font-bold rounded-full ${
                                user.sessionCount > 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-500"
                              }`}>
                                {user.sessionCount}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleForceLogout(user.id)}
                                  disabled={user.sessionCount === 0 || actionUserId !== null}
                                  className="inline-flex items-center justify-center p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/80 rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none"
                                  title="Force logout dari semua sesi"
                                >
                                  <LogOut className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
                                  disabled={isSelf || actionUserId !== null}
                                  className="inline-flex items-center justify-center p-1.5 text-zinc-400 hover:text-red-500 hover:bg-zinc-800/80 rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none"
                                  title="Hapus user secara permanen"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                            Tidak ada pengguna ditemukan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB CONTENT: CONVERSATION AUDIT */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              
              {/* Search Control */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Cari percakapan berdasarkan judul, nama pemilik, atau email..."
                  value={convoSearch}
                  onChange={e => setConvoSearch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-500"
                />
              </div>

              {/* Conversations Table */}
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/10 backdrop-blur-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="border-b border-zinc-800 bg-zinc-950/40 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Judul Percakapan & Pemilik</th>
                        <th className="px-4 py-3 text-center">Jumlah Pesan</th>
                        <th className="px-4 py-3">Status Berbagi</th>
                        <th className="px-4 py-3">Terakhir Diperbarui</th>
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/10">
                      {filteredConversations.map(convo => (
                        <tr key={convo.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-4 py-3.5">
                            <div>
                              <span className="font-semibold text-zinc-100 block truncate max-w-xs sm:max-w-md">
                                {convo.title}
                              </span>
                              <span className="block text-xs text-zinc-500 mt-0.5">
                                Oleh: <span className="text-zinc-400 font-medium">{convo.userName}</span> ({convo.userEmail})
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center text-xs font-semibold text-zinc-300">
                            {convo.messageCount} pesan
                          </td>
                          <td className="px-4 py-3.5">
                            {convo.isShared ? (
                              <div className="flex flex-col gap-1">
                                <span className="inline-flex w-fit items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                                  <Share2 className="h-2.5 w-2.5" />
                                  <span>Publik</span>
                                </span>
                                {convo.shareId && (
                                  <Link
                                    href={`/share/${convo.shareId}`}
                                    target="_blank"
                                    className="text-[10px] text-zinc-500 hover:text-violet-400 transition underline truncate max-w-[120px]"
                                  >
                                    Buka link share
                                  </Link>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 bg-zinc-800 text-zinc-500 border border-transparent rounded-full">
                                Privat
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-zinc-400 text-xs">
                            {new Date(convo.updatedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            {convo.isShared && (
                              <button
                                onClick={() => handleUnshare(convo.id)}
                                disabled={actionConvoId !== null}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-300 hover:text-red-400 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/20 px-2.5 py-1 rounded-lg transition-all"
                              >
                                <span>Unshare</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredConversations.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                            Tidak ada percakapan ditemukan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB CONTENT: SYSTEM SETTINGS */}
          {activeTab === "settings" && (
            <form onSubmit={handleSaveSettings} className="rounded-xl border border-zinc-800 bg-zinc-900/10 backdrop-blur-md p-6 space-y-6 relative overflow-hidden">
              <BorderBeam size={120} duration={12} borderWidth={1} colorFrom="#7c3aed" colorTo="#fbbf24" />
              
              <div className="grid gap-6 md:grid-cols-2">
                
                {/* AI Configuration */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-violet-400 uppercase tracking-wider">AI Defaults</h3>
                  
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-400">Default Model</span>
                    <select
                      value={settings.defaultModel}
                      onChange={e => setSettings(prev => ({ ...prev, defaultModel: e.target.value }))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-violet-500 transition"
                    >
                      {MODEL_OPTIONS.map(model => (
                        <option key={model} value={model}>
                          {getModelLabel(model) || model}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-zinc-400">Temperature ({settings.defaultTemperature})</span>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={settings.defaultTemperature}
                      onChange={e => setSettings(prev => ({ ...prev, defaultTemperature: Number(e.target.value) }))}
                      className="w-full accent-violet-600 bg-zinc-950/60 rounded-xl"
                    />
                  </label>
                </div>

                {/* Policies & Limits */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-violet-400 uppercase tracking-wider">Kebijakan & Quota</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold text-zinc-400">Max Pesan per Chat</span>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={settings.maxMessagesPerChat}
                        onChange={e => setSettings(prev => ({ ...prev, maxMessagesPerChat: parseInt(e.target.value) || 100 }))}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2 text-sm text-white outline-none focus:border-violet-500 transition"
                      />
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold text-zinc-400">Max Karakter Prompt</span>
                      <input
                        type="number"
                        min="10"
                        max="100000"
                        value={settings.maxPromptLength}
                        onChange={e => setSettings(prev => ({ ...prev, maxPromptLength: parseInt(e.target.value) || 4000 }))}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2 text-sm text-white outline-none focus:border-violet-500 transition"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold text-zinc-400">Max Pesan per User per Hari</span>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={settings.maxMessagesPerUserPerDay}
                        onChange={e => setSettings(prev => ({ ...prev, maxMessagesPerUserPerDay: parseInt(e.target.value) || 50 }))}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-violet-500 transition"
                      />
                    </label>

                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold text-zinc-400">Rate Limit per Menit</span>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={settings.rateLimitMessagesPerMinute}
                        onChange={e => setSettings(prev => ({ ...prev, rateLimitMessagesPerMinute: parseInt(e.target.value) || 10 }))}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-violet-500 transition"
                      />
                    </label>
                  </div>

                  <div className="pt-2 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.registrationEnabled}
                        onChange={e => setSettings(prev => ({ ...prev, registrationEnabled: e.target.checked }))}
                        className="h-4.5 w-4.5 rounded border-zinc-800 text-violet-600 bg-zinc-950/60 accent-violet-600 focus:ring-0"
                      />
                      <div>
                        <span className="text-sm font-semibold text-zinc-200">Izinkan Pendaftaran Pengguna Baru</span>
                        <p className="text-[11px] text-zinc-500">Jika mati, user baru tidak bisa melakukan register</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.sharingEnabled}
                        onChange={e => setSettings(prev => ({ ...prev, sharingEnabled: e.target.checked }))}
                        className="h-4.5 w-4.5 rounded border-zinc-800 text-violet-600 bg-zinc-950/60 accent-violet-600 focus:ring-0"
                      />
                      <div>
                        <span className="text-sm font-semibold text-zinc-200">Izinkan Fitur Sharing Percakapan</span>
                        <p className="text-[11px] text-zinc-500">Jika mati, chat row tidak memiliki tombol bagikan publik</p>
                      </div>
                    </label>
                  </div>
                </div>

              </div>

              <div className="space-y-4 pt-4 border-t border-zinc-800/80">
                <label className="block space-y-1.5">
                  <span className="text-xs font-semibold text-zinc-400">Global System Prompt</span>
                  <textarea
                    value={settings.defaultSystemPrompt}
                    onChange={e => setSettings(prev => ({ ...prev, defaultSystemPrompt: e.target.value }))}
                    rows={4}
                    className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2.5 text-sm text-white outline-none focus:border-violet-500 transition"
                    placeholder="Contoh: You are a helpful personal AI assistant..."
                  />
                </label>

                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-bold text-white px-5 py-2.5 transition disabled:opacity-50"
                  >
                    {isSavingSettings ? "Menyimpan..." : "Simpan Setelan Global"}
                  </button>
                  {settingsStatus && (
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${
                      settingsStatus.type === "success" ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {settingsStatus.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      <span>{settingsStatus.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}

          {/* TAB CONTENT: STATISTIK PENGGUNAAN */}
          {activeTab === "usage" && (
            <div className="space-y-6">
              {/* Token Usage Stats Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-md p-6 flex items-start justify-between relative overflow-hidden">
                  <div className="space-y-2">
                    <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Token Hari Ini</span>
                    <p className="text-3xl font-extrabold text-white tracking-tight">
                      {usageStats.todayTokens.total.toLocaleString("id-ID")}
                    </p>
                    <span className="text-[11px] text-zinc-400 block font-medium">
                      Input: {usageStats.todayTokens.input.toLocaleString("id-ID")} | Output: {usageStats.todayTokens.output.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950/80 border border-zinc-800">
                    <BarChart3 className="h-5 w-5 text-violet-400" />
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-md p-6 flex items-start justify-between relative overflow-hidden">
                  <div className="space-y-2">
                    <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Token Kumulatif (All-Time)</span>
                    <p className="text-3xl font-extrabold text-white tracking-tight">
                      {usageStats.allTimeTokens.total.toLocaleString("id-ID")}
                    </p>
                    <span className="text-[11px] text-zinc-400 block font-medium">
                      Input: {usageStats.allTimeTokens.input.toLocaleString("id-ID")} | Output: {usageStats.allTimeTokens.output.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950/80 border border-zinc-800">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-md p-6 flex items-start justify-between relative overflow-hidden">
                  <div className="space-y-2">
                    <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Estimasi Biaya Hari Ini</span>
                    <p className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                      ${((usageStats.todayTokens.input * 0.075 / 1000000) + (usageStats.todayTokens.output * 0.3 / 1000000)).toFixed(5)}
                    </p>
                    <span className="text-[11px] text-zinc-400 block font-medium">
                      Berdasarkan tarif Gemini 2.5 Flash
                    </span>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950/80 border border-zinc-800">
                    <Database className="h-5 w-5 text-emerald-400" />
                  </div>
                </div>
              </div>

              {/* Usage per User Table */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Konsumsi Pengguna Hari Ini</h3>
                <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/10 backdrop-blur-md">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-300">
                      <thead className="border-b border-zinc-800 bg-zinc-950/40 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Pengguna</th>
                          <th className="px-4 py-3 text-center">Jumlah Pesan</th>
                          <th className="px-4 py-3 text-center">Token Input</th>
                          <th className="px-4 py-3 text-center">Token Output</th>
                          <th className="px-4 py-3 text-center">Total Token</th>
                          <th className="px-4 py-3 text-right">Kuota Pesan Harian</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/10">
                        {usageStats.byUserToday.map(item => {
                          const user = users.find(u => u.id === item.userId);
                          const percentage = Math.min(100, Math.round((item.messageCount / settings.maxMessagesPerUserPerDay) * 100));
                          return (
                            <tr key={item.userId} className="hover:bg-zinc-800/20 transition-colors">
                              <td className="px-4 py-3.5">
                                <div>
                                  <span className="font-semibold text-zinc-100 block">
                                    {user?.name || "Unknown User"}
                                  </span>
                                  <span className="block text-xs text-zinc-500 mt-0.5">
                                    {user?.email || item.userId}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-center font-medium text-zinc-200">
                                {item.messageCount} pesan
                              </td>
                              <td className="px-4 py-3.5 text-center text-zinc-400 text-xs">
                                {item.inputTokens.toLocaleString("id-ID")}
                              </td>
                              <td className="px-4 py-3.5 text-center text-zinc-400 text-xs">
                                {item.outputTokens.toLocaleString("id-ID")}
                              </td>
                              <td className="px-4 py-3.5 text-center text-violet-400 font-semibold">
                                {item.totalTokens.toLocaleString("id-ID")}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <div className="flex flex-col items-end gap-1">
                                  <span className="text-xs font-semibold text-zinc-300">
                                    {item.messageCount} / {settings.maxMessagesPerUserPerDay} ({percentage}%)
                                  </span>
                                  <div className="w-24 bg-zinc-850 border border-zinc-800 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${
                                        percentage > 90 ? "bg-red-500" : percentage > 70 ? "bg-amber-500" : "bg-violet-500"
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {usageStats.byUserToday.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                              Belum ada aktivitas penggunaan hari ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Recent Usage Logs */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Log Penggunaan Terbaru (Hari Ini)</h3>
                <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/10 backdrop-blur-md">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-300">
                      <thead className="border-b border-zinc-800 bg-zinc-950/40 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Waktu</th>
                          <th className="px-4 py-3">User</th>
                          <th className="px-4 py-3">Model</th>
                          <th className="px-4 py-3 text-center">Token Input</th>
                          <th className="px-4 py-3 text-center">Token Output</th>
                          <th className="px-4 py-3 text-right">Total Token</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/10">
                        {usageStats.todayEvents.map(event => {
                          const user = users.find(u => u.id === event.userId);
                          return (
                            <tr key={event.id} className="hover:bg-zinc-800/20 transition-colors">
                              <td className="px-4 py-3 text-zinc-400 text-xs">
                                {new Date(event.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <span className="font-semibold text-zinc-200 block truncate max-w-[150px]">
                                    {user?.name || "Unknown User"}
                                  </span>
                                  <span className="block text-[10px] text-zinc-500 truncate max-w-[150px]">
                                    {user?.email || event.userId}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-zinc-300 text-xs">
                                {getModelLabel(event.model || "") || event.model}
                              </td>
                              <td className="px-4 py-3 text-center text-zinc-400 text-xs">
                                {event.inputTokens.toLocaleString("id-ID")}
                              </td>
                              <td className="px-4 py-3 text-center text-zinc-400 text-xs">
                                {event.outputTokens.toLocaleString("id-ID")}
                              </td>
                              <td className="px-4 py-3 text-right text-violet-400 font-semibold">
                                {(event.inputTokens + event.outputTokens).toLocaleString("id-ID")}
                              </td>
                            </tr>
                          );
                        })}
                        {usageStats.todayEvents.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                              Tidak ada log penggunaan terbaru hari ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: MAINTENANCE */}
          {activeTab === "maintenance" && (
            <div className="space-y-6">
              
              <div className="grid gap-6 md:grid-cols-2">
                
                {/* Smoke Test Health */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 backdrop-blur-md p-6 space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white">Smoke Test Observabilitas</h3>
                    <p className="text-xs text-zinc-400">Verifikasi status konektivitas eksternal database PostgreSQL dan API Gemini key.</p>
                    
                    {healthError && (
                      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                        <XCircle className="h-4 w-4 shrink-0" />
                        <span>{healthError}</span>
                      </div>
                    )}

                    {healthData && (
                      <div className="mt-4 space-y-3">
                        <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3 flex items-center justify-between text-sm">
                          <span className="text-zinc-400 font-medium">Status API</span>
                          <span className="font-bold text-emerald-400 uppercase">{healthData.status}</span>
                        </div>
                        <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3 flex items-center justify-between text-sm">
                          <span className="text-zinc-400 font-medium">Latensi DB</span>
                          <span className="font-bold text-zinc-200">{healthData.database?.latencyMs} ms</span>
                        </div>
                        <div className="bg-zinc-950/60 border border-zinc-800 rounded-lg p-3 flex items-center justify-between text-sm">
                          <span className="text-zinc-400 font-medium">Lingkungan Run</span>
                          <span className="font-bold text-zinc-400 capitalize">{healthData.environment}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={fetchHealth}
                    disabled={isCheckingHealth}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-bold py-2.5 text-white transition-all mt-4 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isCheckingHealth ? "animate-spin" : ""}`} />
                    <span>Jalankan Live Health Check</span>
                  </button>
                </div>

                {/* Raw response */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 backdrop-blur-md p-6 space-y-2">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Respons Payload Mentah</h3>
                  <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 text-xs font-mono text-zinc-300 overflow-auto max-h-64">
                    {healthData ? (
                      <pre>{JSON.stringify(healthData, null, 2)}</pre>
                    ) : (
                      <span className="text-zinc-600">Klik tombol di sebelah kiri untuk melihat output respons JSON.</span>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB CONTENT: GLOBAL ACTIVITY LOGS */}
          {activeTab === "activity" && (
            <div className="space-y-4">
              
              {/* Search Control & Refresh */}
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Cari log berdasarkan tipe, nama, email, atau metadata..."
                    value={adminActivitySearch}
                    onChange={e => setAdminActivitySearch(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/40 py-2.5 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-500"
                  />
                </div>
                <button
                  onClick={fetchAdminActivities}
                  disabled={loadingAdminActivities}
                  className="flex items-center justify-center gap-2 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-xs font-semibold py-2.5 px-4 text-zinc-300 transition-all shrink-0 border border-zinc-750"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingAdminActivities ? "animate-spin" : ""}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {adminActivityError && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300 font-medium">
                  {adminActivityError}
                </p>
              )}

              {/* Table */}
              <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/10 backdrop-blur-md relative">
                <BorderBeam size={100} duration={8} borderWidth={1} colorFrom="#7c3aed" colorTo="#3b82f6" />
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="border-b border-zinc-800 bg-zinc-950/40 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Waktu</th>
                        <th className="px-4 py-3">Pengguna</th>
                        <th className="px-4 py-3">Tipe Aktivitas</th>
                        <th className="px-4 py-3">Detail & Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/10">
                      {loadingAdminActivities ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                            <span className="inline-flex items-center gap-2">
                              <RefreshCw className="h-4 w-4 animate-spin text-violet-500" />
                              Memuat log aktivitas...
                            </span>
                          </td>
                        </tr>
                      ) : filteredAdminActivities.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                            Tidak ada log aktivitas ditemukan.
                          </td>
                        </tr>
                      ) : (
                        filteredAdminActivities.map(act => {
                          let displayType = String(act.type);
                          let colorClass = "text-zinc-300";
                          let detailString = "";
                          const md = act.metadata as Record<string, unknown> | undefined;

                          if (act.type === "login_success") {
                            displayType = "Masuk Log Berhasil";
                            colorClass = "text-emerald-400 font-semibold";
                            detailString = typeof md?.email === "string" ? `Email: ${md.email}` : "";
                          } else if (act.type === "login_failed") {
                            displayType = "Masuk Log Gagal";
                            colorClass = "text-red-400 font-semibold";
                            detailString = typeof md?.email === "string" ? `Email: ${md.email} (${md.reason || ""})` : "";
                          } else if (act.type === "register_success") {
                            displayType = "Registrasi Akun Baru";
                            colorClass = "text-violet-400 font-semibold";
                            detailString = typeof md?.email === "string" ? `Email: ${md.email}` : "";
                          } else if (act.type === "register_failed") {
                            displayType = "Registrasi Gagal";
                            colorClass = "text-red-400 font-semibold";
                            detailString = typeof md?.email === "string" ? `Email: ${md.email} (${md.reason || ""})` : "";
                          } else if (act.type === "settings_saved") {
                            displayType = "Pengaturan Disimpan";
                            colorClass = "text-blue-400 font-semibold";
                            detailString = `Model: ${md?.defaultModel ?? ""}`;
                          } else if (act.type === "share_enabled") {
                            displayType = "Membagikan Percakapan";
                            colorClass = "text-teal-400 font-semibold";
                            detailString = typeof md?.conversationTitle === "string" ? `"${md.conversationTitle}"` : "";
                          } else if (act.type === "share_disabled") {
                            displayType = "Menghentikan Berbagi";
                            colorClass = "text-amber-400 font-semibold";
                            detailString = typeof md?.conversationTitle === "string" ? `"${md.conversationTitle}"` : "";
                          } else if (act.type === "file_uploaded") {
                            displayType = "Mengunggah File";
                            colorClass = "text-indigo-400 font-semibold";
                            const size = typeof md?.sizeBytes === "number" ? md.sizeBytes : 0;
                            detailString = typeof md?.filename === "string" ? `${md.filename} (${(size / 1024).toFixed(1)} KB)` : "";
                          }

                          return (
                            <tr key={act.id} className="hover:bg-zinc-800/10 transition-colors">
                              <td className="px-4 py-3 text-zinc-400 text-xs shrink-0 whitespace-nowrap">
                                {new Date(act.createdAt).toLocaleString("id-ID", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  <span className="font-semibold text-zinc-200 block truncate max-w-[180px]">
                                    {act.userName || "Guest / Unauthenticated"}
                                  </span>
                                  {act.userEmail && (
                                    <span className="block text-[10px] text-zinc-500 truncate max-w-[180px]">
                                      {act.userEmail}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-xs ${colorClass}`}>{displayType}</span>
                              </td>
                              <td className="px-4 py-3 text-xs text-zinc-400 max-w-xs truncate">
                                {detailString || JSON.stringify(act.metadata)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  desc,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  desc: string;
}): React.ReactElement {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-md p-6 flex items-start justify-between hover:border-zinc-700/60 transition-colors">
      <div className="space-y-2">
        <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">{title}</span>
        <p className="text-3xl font-extrabold text-white tracking-tight">{value}</p>
        <span className="text-[11px] text-zinc-400 block">{desc}</span>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-950/80 border border-zinc-800">
        <Icon className="h-5 w-5 text-violet-400" />
      </div>
    </div>
  );
}
