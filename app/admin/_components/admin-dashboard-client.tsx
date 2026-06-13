"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Settings,
  Activity,
  LogOut,
  MessageSquare,
  Share2,
  Trash2,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  Server,
  Database,
  BarChart3,
  Clock,
  Wrench,
  Image as ImageIcon,
  BookOpen,
  Brain,
  ExternalLink,
  Cpu,
  Gauge,
  Plus,
  Pencil,
} from "lucide-react";
import { getModelLabel } from "@/app/_components/settings-modal";
import { useToast } from "@/components/ui/toast-provider";
import {
  SerializedUser,
  SerializedConversation,
  AdminSettings,
  AdminDashboardStats,
  UsageStats,
} from "@/types/admin.types";
import {
  Card,
  PageHeader,
  StatCard,
  StatusPill,
  Button,
  IconButton,
  SearchInput,
  Field,
  NumberInput,
  Select,
  Textarea,
  Toggle,
  SettingRow,
  SectionHeading,
  EmptyState,
} from "./ui/primitives";
import { DataTable } from "./ui/data-table";
import { useConfirmDialog } from "./ui/confirm-dialog";
import { KnowledgeFormModal, type KnowledgeFormValues } from "./ui/knowledge-form-modal";

const MODEL_OPTIONS = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-1.5-flash"];

// Rough public Gemini Flash rates (USD / 1M tokens) — clearly an estimate.
const RATE_INPUT_PER_M = 0.075;
const RATE_OUTPUT_PER_M = 0.3;

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "users", label: "Manajemen User", icon: Users },
  { id: "audit", label: "Audit Percakapan", icon: MessageSquare },
  { id: "activity", label: "Log Aktivitas", icon: Clock },
  { id: "usage", label: "Statistik Penggunaan", icon: BarChart3 },
  { id: "knowledge", label: "Knowledge Base", icon: BookOpen },
  { id: "settings", label: "Setelan Sistem", icon: Settings },
  { id: "maintenance", label: "Kesehatan & Latensi", icon: Server },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TAB_META: Record<TabId, { eyebrow: string; title: string; description: string }> = {
  dashboard: { eyebrow: "Ringkasan", title: "Dashboard", description: "Pantau kesehatan sistem dan metrik utama dalam satu tampilan." },
  users: { eyebrow: "Manajemen", title: "Manajemen User", description: "Cari, keluarkan paksa, atau hapus akun pengguna." },
  audit: { eyebrow: "Moderasi", title: "Audit Percakapan", description: "Tinjau dan cabut tautan berbagi percakapan pengguna." },
  activity: { eyebrow: "Audit", title: "Log Aktivitas", description: "Riwayat peristiwa autentikasi dan sistem terbaru." },
  usage: { eyebrow: "Analitik", title: "Statistik Penggunaan", description: "Konsumsi token dan kuota harian per pengguna." },
  knowledge: { eyebrow: "Konten", title: "Knowledge Base", description: "Tinjau dan moderasi basis pengetahuan semua pengguna." },
  settings: { eyebrow: "Konfigurasi", title: "Setelan Sistem", description: "Default AI, kebijakan & kuota, tools, dan guardrails." },
  maintenance: { eyebrow: "Operasional", title: "Kesehatan & Latensi", description: "Cek konektivitas database PostgreSQL dan API Gemini." },
};

type PillTone = "neutral" | "success" | "danger" | "info" | "warning";

const ACTIVITY_META: Record<string, { label: string; tone: PillTone }> = {
  login_success: { label: "Login berhasil", tone: "success" },
  login_failed: { label: "Login gagal", tone: "danger" },
  register_success: { label: "Registrasi baru", tone: "info" },
  register_failed: { label: "Registrasi gagal", tone: "danger" },
  settings_saved: { label: "Pengaturan disimpan", tone: "info" },
  share_enabled: { label: "Membagikan percakapan", tone: "success" },
  share_disabled: { label: "Menghentikan berbagi", tone: "warning" },
  file_uploaded: { label: "Mengunggah file", tone: "neutral" },
};

type AdminActivity = {
  id: string;
  type: string;
  createdAt: string | Date;
  userId?: string;
  userName?: string;
  userEmail?: string;
  metadata?: Record<string, unknown>;
};

type AdminKnowledgeEntry = {
  id: string;
  title: string;
  tags: string | null;
  enabled: boolean;
  isGlobal: boolean;
  source: string | null;
  content: string;
  contentPreview: string;
  contentLength: number;
  userEmail: string | null;
  userName: string | null;
  createdAt: string;
  updatedAt: string;
};

type HealthData = {
  status?: string;
  environment?: string;
  database?: { latencyMs: number };
  gemini?: { configured: boolean };
  [key: string]: unknown;
} | null;

function activityDetail(act: AdminActivity): string {
  const md = act.metadata as Record<string, unknown> | undefined;
  if (!md) return "";
  switch (act.type) {
    case "login_success":
    case "register_success":
      return typeof md.email === "string" ? `Email: ${md.email}` : "";
    case "login_failed":
    case "register_failed":
      return typeof md.email === "string" ? `Email: ${md.email}${md.reason ? ` (${md.reason})` : ""}` : "";
    case "settings_saved":
      return md.defaultModel ? `Model: ${md.defaultModel}` : "";
    case "share_enabled":
    case "share_disabled":
      return typeof md.conversationTitle === "string" ? `"${md.conversationTitle}"` : "";
    case "file_uploaded": {
      const size = typeof md.sizeBytes === "number" ? md.sizeBytes : 0;
      return typeof md.filename === "string" ? `${md.filename} (${(size / 1024).toFixed(1)} KB)` : "";
    }
    default:
      return "";
  }
}

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
  const toast = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  const [users, setUsers] = useState<SerializedUser[]>(initialUsers);
  const [userSearch, setUserSearch] = useState("");
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<SerializedConversation[]>(initialConversations);
  const [convoSearch, setConvoSearch] = useState("");
  const [actionConvoId, setActionConvoId] = useState<string | null>(null);

  const [settings, setSettings] = useState<AdminSettings>(initialSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [healthData, setHealthData] = useState<HealthData>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const [adminActivities, setAdminActivities] = useState<AdminActivity[]>([]);
  const [loadingAdminActivities, setLoadingAdminActivities] = useState(false);
  const [adminActivityError, setAdminActivityError] = useState<string | null>(null);
  const [adminActivitySearch, setAdminActivitySearch] = useState("");

  const [knowledgeEntries, setKnowledgeEntries] = useState<AdminKnowledgeEntry[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [actionKnowledgeId, setActionKnowledgeId] = useState<string | null>(null);
  const [knowledgeModalOpen, setKnowledgeModalOpen] = useState(false);
  const [knowledgeEditing, setKnowledgeEditing] = useState<AdminKnowledgeEntry | null>(null);
  const [savingKnowledge, setSavingKnowledge] = useState(false);

  // Deep-link tabs via URL hash (kept on refresh / shareable) without changing routes.
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (TABS.some((t) => t.id === hash)) setActiveTab(hash as TabId);
  }, []);

  const selectTab = useCallback((id: TabId) => {
    setActiveTab(id);
    window.history.replaceState(null, "", `#${id}`);
  }, []);

  const fetchHealth = useCallback(async () => {
    setIsCheckingHealth(true);
    setHealthError(null);
    try {
      const res = await fetch("/api/admin/health");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data kesehatan");
      setHealthData(data);
    } catch (err) {
      setHealthError((err as Error).message || "Gagal terhubung ke health API");
    } finally {
      setIsCheckingHealth(false);
    }
  }, []);

  const fetchAdminActivities = useCallback(async () => {
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
  }, []);

  const fetchKnowledge = useCallback(async () => {
    setLoadingKnowledge(true);
    setKnowledgeError(null);
    try {
      const res = await fetch("/api/admin/knowledge");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat knowledge base");
      setKnowledgeEntries(data.entries || []);
    } catch (err) {
      setKnowledgeError((err as Error).message || "Gagal memuat knowledge base");
    } finally {
      setLoadingKnowledge(false);
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    if (activeTab === "activity") void fetchAdminActivities();
  }, [activeTab, fetchAdminActivities]);

  useEffect(() => {
    if (activeTab === "knowledge") void fetchKnowledge();
  }, [activeTab, fetchKnowledge]);

  async function handleForceLogout(userId: string) {
    const ok = await confirm({
      title: "Keluarkan paksa user ini?",
      description: "Semua sesi aktif pengguna akan dihentikan di seluruh perangkat.",
      confirmLabel: "Keluarkan paksa",
      tone: "danger",
    });
    if (!ok) return;
    setActionUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/logout`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal force logout");
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, sessionCount: 0 } : u)));
      toast.success("User berhasil dikeluarkan dari semua sesi.");
    } catch (err) {
      toast.error((err as Error).message || "Gagal force logout.");
    } finally {
      setActionUserId(null);
    }
  }

  async function handleDeleteUser(userId: string) {
    const ok = await confirm({
      title: "Hapus user secara permanen?",
      description: "Semua percakapan dan pesan milik user ini akan ikut terhapus dan tidak dapat dikembalikan.",
      confirmLabel: "Hapus permanen",
      tone: "danger",
    });
    if (!ok) return;
    setActionUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus user");
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User berhasil dihapus.");
    } catch (err) {
      toast.error((err as Error).message || "Gagal menghapus user.");
    } finally {
      setActionUserId(null);
    }
  }

  async function handleUnshare(convoId: string) {
    const ok = await confirm({
      title: "Batalkan tautan berbagi?",
      description: "Percakapan akan kembali menjadi privat dan tautan publiknya tidak bisa diakses lagi.",
      confirmLabel: "Jadikan privat",
    });
    if (!ok) return;
    setActionConvoId(convoId);
    try {
      const res = await fetch(`/api/admin/conversations/${convoId}/unshare`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membatalkan share");
      setConversations((prev) =>
        prev.map((c) => (c.id === convoId ? { ...c, isShared: false, shareId: null, sharedAt: null } : c))
      );
      toast.success("Percakapan kembali menjadi privat.");
    } catch (err) {
      toast.error((err as Error).message || "Gagal membatalkan share.");
    } finally {
      setActionConvoId(null);
    }
  }

  async function handleToggleKnowledge(id: string, enabled: boolean) {
    setActionKnowledgeId(id);
    try {
      const res = await fetch(`/api/admin/knowledge/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui");
      setKnowledgeEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, enabled } : entry)));
      toast.success(enabled ? "Pengetahuan diaktifkan." : "Pengetahuan dinonaktifkan.");
    } catch (err) {
      toast.error((err as Error).message || "Gagal memperbarui pengetahuan.");
    } finally {
      setActionKnowledgeId(null);
    }
  }

  async function handleDeleteKnowledge(id: string) {
    const ok = await confirm({
      title: "Hapus entri pengetahuan?",
      description: "Entri ini akan dihapus permanen dari knowledge base pengguna.",
      confirmLabel: "Hapus",
      tone: "danger",
    });
    if (!ok) return;
    setActionKnowledgeId(id);
    try {
      const res = await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      setKnowledgeEntries((prev) => prev.filter((entry) => entry.id !== id));
      toast.success("Entri pengetahuan dihapus.");
    } catch (err) {
      toast.error((err as Error).message || "Gagal menghapus pengetahuan.");
    } finally {
      setActionKnowledgeId(null);
    }
  }

  function openCreateKnowledge() {
    setKnowledgeEditing(null);
    setKnowledgeModalOpen(true);
  }

  function openEditKnowledge(entry: AdminKnowledgeEntry) {
    setKnowledgeEditing(entry);
    setKnowledgeModalOpen(true);
  }

  async function handleSubmitKnowledge(values: KnowledgeFormValues) {
    setSavingKnowledge(true);
    try {
      const editingId = knowledgeEditing?.id;
      const res = await fetch(
        editingId ? `/api/admin/knowledge/${editingId}` : "/api/admin/knowledge",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: values.title,
            content: values.content,
            tags: values.tags.trim() || null,
            enabled: values.enabled,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      toast.success(editingId ? "Pengetahuan diperbarui." : "Pengetahuan global ditambahkan.");
      setKnowledgeModalOpen(false);
      setKnowledgeEditing(null);
      await fetchKnowledge();
    } catch (err) {
      toast.error((err as Error).message || "Gagal menyimpan pengetahuan.");
    } finally {
      setSavingKnowledge(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
          toolsEnabled: settings.toolsEnabled,
          imageToolEnabled: settings.imageToolEnabled,
          knowledgeToolEnabled: settings.knowledgeToolEnabled,
          memoryToolEnabled: settings.memoryToolEnabled,
          guardrailsEnabled: settings.guardrailsEnabled,
          blockedKeywords: settings.blockedKeywords,
          maxToolCallsPerMessage: settings.maxToolCallsPerMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan setelan");
      setSettings(data.settings);
      toast.success("Setelan global berhasil disimpan.");
    } catch (err) {
      toast.error((err as Error).message || "Gagal menyimpan setelan.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredConversations = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(convoSearch.toLowerCase()) ||
      c.userEmail.toLowerCase().includes(convoSearch.toLowerCase()) ||
      (c.userName || "").toLowerCase().includes(convoSearch.toLowerCase())
  );

  const filteredAdminActivities = adminActivities.filter((act) => {
    const term = adminActivitySearch.toLowerCase();
    return (
      act.type.toLowerCase().includes(term) ||
      (act.userName || "").toLowerCase().includes(term) ||
      (act.userEmail || "").toLowerCase().includes(term) ||
      JSON.stringify(act.metadata || "").toLowerCase().includes(term)
    );
  });

  const filteredKnowledge = knowledgeEntries.filter((entry) => {
    const term = knowledgeSearch.toLowerCase();
    return (
      entry.title.toLowerCase().includes(term) ||
      entry.contentPreview.toLowerCase().includes(term) ||
      (entry.tags || "").toLowerCase().includes(term) ||
      (entry.userEmail || "").toLowerCase().includes(term) ||
      (entry.userName || "").toLowerCase().includes(term)
    );
  });

  const estimatedCost =
    (usageStats.todayTokens.input * RATE_INPUT_PER_M) / 1_000_000 +
    (usageStats.todayTokens.output * RATE_OUTPUT_PER_M) / 1_000_000;

  const meta = TAB_META[activeTab];

  return (
    <main className="min-h-screen bg-bg text-foreground">
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="flex w-full flex-col justify-between border-b border-border bg-sidebar p-5 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
          <div>
            <div className="flex items-center gap-3 px-1">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <ShieldCheck className="h-5 w-5 text-primary-foreground" aria-hidden />
              </span>
              <div>
                <h1 className="text-sm font-semibold tracking-tight text-foreground">Control Panel</h1>
                <p className="text-[11px] text-muted-foreground">Konsol Administrator</p>
              </div>
            </div>

            <nav aria-label="Navigasi admin" className="mt-7 space-y-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => selectTab(tab.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-8 border-t border-border pt-4">
            <Link
              href="/"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              <span>Kembali ke Chat</span>
            </Link>
          </div>
        </aside>

        {/* Content */}
        <section className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-5 md:p-8">
          <PageHeader
            eyebrow={meta.eyebrow}
            title={meta.title}
            description={meta.description}
            actions={
              activeTab === "activity" ? (
                <Button variant="secondary" size="sm" onClick={fetchAdminActivities} disabled={loadingAdminActivities}>
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingAdminActivities ? "animate-spin" : ""}`} aria-hidden />
                  Segarkan
                </Button>
              ) : activeTab === "knowledge" ? (
                <>
                  <Button variant="secondary" size="sm" onClick={fetchKnowledge} disabled={loadingKnowledge}>
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingKnowledge ? "animate-spin" : ""}`} aria-hidden />
                    Segarkan
                  </Button>
                  <Button variant="primary" size="sm" onClick={openCreateKnowledge}>
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Tambah Pengetahuan
                  </Button>
                </>
              ) : activeTab === "dashboard" ? (
                <Button variant="secondary" size="sm" onClick={fetchHealth} disabled={isCheckingHealth}>
                  <RefreshCw className={`h-3.5 w-3.5 ${isCheckingHealth ? "animate-spin" : ""}`} aria-hidden />
                  Perbarui status
                </Button>
              ) : undefined
            }
          />

          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Pengguna" value={stats.totalUsers.toLocaleString("id-ID")} icon={Users} hint="Terdaftar" />
                <StatCard label="Total Percakapan" value={stats.totalConversations.toLocaleString("id-ID")} icon={MessageSquare} delta={{ value: `+${stats.conversationsCreatedToday} hari ini`, tone: stats.conversationsCreatedToday > 0 ? "up" : "neutral" }} />
                <StatCard label="Total Pesan" value={stats.totalMessages.toLocaleString("id-ID")} icon={Cpu} delta={{ value: `+${stats.messagesCreatedToday} hari ini`, tone: stats.messagesCreatedToday > 0 ? "up" : "neutral" }} />
                <StatCard label="Sesi Aktif" value={stats.activeSessions.toLocaleString("id-ID")} icon={LogOut} hint="Sedang login" />
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="p-6 lg:col-span-2">
                  <SectionHeading title="Aktivitas Hari Ini" description="Pertumbuhan dalam 24 jam terakhir." />
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border bg-accent/50 p-4">
                      <span className="text-xs font-medium text-muted-foreground">Chat Baru</span>
                      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">+{stats.conversationsCreatedToday}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-accent/50 p-4">
                      <span className="text-xs font-medium text-muted-foreground">Pesan Baru</span>
                      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">+{stats.messagesCreatedToday}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Percakapan publik aktif:{" "}
                    <span className="font-semibold text-foreground tabular-nums">{stats.totalSharedConversations}</span>
                  </p>
                </Card>

                <Card className="flex flex-col justify-between p-6">
                  <div>
                    <SectionHeading title="Konektivitas" description="Status provider data real-time." />
                    <div className="mt-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm text-foreground">
                          <Database className="h-4 w-4 text-muted-foreground" aria-hidden />
                          Database PG
                        </span>
                        {healthData?.database ? (
                          <StatusPill tone="success" dot>{healthData.database.latencyMs} ms</StatusPill>
                        ) : (
                          <span className="text-xs text-muted-foreground">{isCheckingHealth ? "Memeriksa…" : "—"}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm text-foreground">
                          <Server className="h-4 w-4 text-muted-foreground" aria-hidden />
                          Gemini Key
                        </span>
                        {healthData?.gemini ? (
                          <StatusPill tone={healthData.gemini.configured ? "success" : "danger"}>
                            {healthData.gemini.configured ? "Terkonfigurasi" : "Belum diset"}
                          </StatusPill>
                        ) : (
                          <span className="text-xs text-muted-foreground">{isCheckingHealth ? "Memeriksa…" : "—"}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" className="mt-6 w-full" onClick={fetchHealth} disabled={isCheckingHealth}>
                    <RefreshCw className={`h-3.5 w-3.5 ${isCheckingHealth ? "animate-spin" : ""}`} aria-hidden />
                    Perbarui Status
                  </Button>
                </Card>
              </div>
            </div>
          )}

          {/* USERS */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <SearchInput
                label="Cari pengguna"
                placeholder="Cari berdasarkan nama atau email…"
                value={userSearch}
                onChange={setUserSearch}
              />
              <DataTable<SerializedUser>
                caption="Daftar pengguna terdaftar"
                rows={filteredUsers}
                getRowKey={(u) => u.id}
                empty={{ icon: Users, title: "Tidak ada pengguna ditemukan", description: "Coba kata kunci pencarian yang berbeda." }}
                columns={[
                  {
                    key: "user",
                    header: "Pengguna",
                    render: (u) => {
                      const isSelf = u.email.toLowerCase() === adminEmail.toLowerCase();
                      return (
                        <div>
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            {u.name || "Tanpa nama"}
                            {isSelf ? <StatusPill tone="info">Admin</StatusPill> : null}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{u.email}</span>
                        </div>
                      );
                    },
                  },
                  {
                    key: "createdAt",
                    header: "Terdaftar",
                    hideOnMobile: true,
                    render: (u) => (
                      <span className="text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                      </span>
                    ),
                  },
                  {
                    key: "counts",
                    header: "Chat / Pesan",
                    align: "right",
                    render: (u) => (
                      <span className="text-xs text-foreground">
                        {u.conversationCount.toLocaleString("id-ID")} / {u.messageCount.toLocaleString("id-ID")}
                      </span>
                    ),
                  },
                  {
                    key: "sessions",
                    header: "Sesi",
                    align: "center",
                    render: (u) => (
                      <StatusPill tone={u.sessionCount > 0 ? "success" : "neutral"}>{u.sessionCount}</StatusPill>
                    ),
                  },
                  {
                    key: "actions",
                    header: "Aksi",
                    align: "right",
                    render: (u) => {
                      const isSelf = u.email.toLowerCase() === adminEmail.toLowerCase();
                      return (
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            label="Keluarkan paksa dari semua sesi"
                            tone="warning"
                            disabled={u.sessionCount === 0 || actionUserId !== null}
                            onClick={() => handleForceLogout(u.id)}
                          >
                            <LogOut className="h-4 w-4" aria-hidden />
                          </IconButton>
                          <IconButton
                            label="Hapus user permanen"
                            tone="danger"
                            disabled={isSelf || actionUserId !== null}
                            onClick={() => handleDeleteUser(u.id)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </IconButton>
                        </div>
                      );
                    },
                  },
                ]}
              />
            </div>
          )}

          {/* AUDIT */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <SearchInput
                label="Cari percakapan"
                placeholder="Cari berdasarkan judul, nama, atau email pemilik…"
                value={convoSearch}
                onChange={setConvoSearch}
              />
              <DataTable<SerializedConversation>
                caption="Daftar percakapan untuk audit"
                rows={filteredConversations}
                getRowKey={(c) => c.id}
                empty={{ icon: MessageSquare, title: "Tidak ada percakapan ditemukan", description: "Coba kata kunci pencarian yang berbeda." }}
                columns={[
                  {
                    key: "title",
                    header: "Percakapan & Pemilik",
                    render: (c) => (
                      <div>
                        <span className="block max-w-xs truncate font-medium text-foreground sm:max-w-md">{c.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {c.userName} · {c.userEmail}
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: "messages",
                    header: "Pesan",
                    align: "right",
                    render: (c) => <span className="text-xs text-foreground">{c.messageCount.toLocaleString("id-ID")}</span>,
                  },
                  {
                    key: "status",
                    header: "Status Berbagi",
                    render: (c) =>
                      c.isShared ? (
                        <div className="flex flex-col items-start gap-1">
                          <StatusPill tone="success" dot>
                            <Share2 className="h-3 w-3" aria-hidden /> Publik
                          </StatusPill>
                          {c.shareId ? (
                            <Link
                              href={`/share/${c.shareId}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-[11px] text-primary underline-offset-2 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" aria-hidden /> Buka tautan
                            </Link>
                          ) : null}
                        </div>
                      ) : (
                        <StatusPill tone="neutral">Privat</StatusPill>
                      ),
                  },
                  {
                    key: "updatedAt",
                    header: "Diperbarui",
                    hideOnMobile: true,
                    render: (c) => (
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.updatedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    ),
                  },
                  {
                    key: "actions",
                    header: "Aksi",
                    align: "right",
                    render: (c) =>
                      c.isShared ? (
                        <Button variant="danger" size="sm" disabled={actionConvoId !== null} onClick={() => handleUnshare(c.id)}>
                          Unshare
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      ),
                  },
                ]}
              />
            </div>
          )}

          {/* ACTIVITY */}
          {activeTab === "activity" && (
            <div className="space-y-4">
              <SearchInput
                label="Cari log aktivitas"
                placeholder="Cari berdasarkan tipe, nama, email, atau metadata…"
                value={adminActivitySearch}
                onChange={setAdminActivitySearch}
              />
              <DataTable<AdminActivity>
                caption="Log aktivitas global"
                rows={filteredAdminActivities}
                getRowKey={(a) => a.id}
                isLoading={loadingAdminActivities}
                error={adminActivityError}
                onRetry={fetchAdminActivities}
                empty={{ icon: Clock, title: "Tidak ada log aktivitas", description: "Aktivitas pengguna akan muncul di sini." }}
                columns={[
                  {
                    key: "time",
                    header: "Waktu",
                    hideOnMobile: true,
                    render: (a) => (
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                      </span>
                    ),
                  },
                  {
                    key: "user",
                    header: "Pengguna",
                    render: (a) => (
                      <div>
                        <span className="block max-w-[180px] truncate font-medium text-foreground">
                          {a.userName || "Tamu / belum login"}
                        </span>
                        {a.userEmail ? (
                          <span className="block max-w-[180px] truncate text-[11px] text-muted-foreground">{a.userEmail}</span>
                        ) : null}
                      </div>
                    ),
                  },
                  {
                    key: "type",
                    header: "Aktivitas",
                    render: (a) => {
                      const m = ACTIVITY_META[a.type] ?? { label: a.type, tone: "neutral" as PillTone };
                      return <StatusPill tone={m.tone}>{m.label}</StatusPill>;
                    },
                  },
                  {
                    key: "detail",
                    header: "Detail",
                    render: (a) => (
                      <span className="block max-w-xs truncate text-xs text-muted-foreground">{activityDetail(a) || "—"}</span>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {/* USAGE */}
          {activeTab === "usage" && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                  label="Token Hari Ini"
                  value={usageStats.todayTokens.total.toLocaleString("id-ID")}
                  icon={BarChart3}
                  hint={`In ${usageStats.todayTokens.input.toLocaleString("id-ID")} · Out ${usageStats.todayTokens.output.toLocaleString("id-ID")}`}
                />
                <StatCard
                  label="Token Kumulatif"
                  value={usageStats.allTimeTokens.total.toLocaleString("id-ID")}
                  icon={Database}
                  hint={`In ${usageStats.allTimeTokens.input.toLocaleString("id-ID")} · Out ${usageStats.allTimeTokens.output.toLocaleString("id-ID")}`}
                />
                <StatCard
                  label="Estimasi Biaya Hari Ini"
                  value={`$${estimatedCost.toFixed(5)}`}
                  icon={Gauge}
                  hint="Estimasi tarif Gemini Flash"
                />
              </div>

              <div className="space-y-3">
                <SectionHeading title="Konsumsi Pengguna Hari Ini" />
                <DataTable<UsageStats["byUserToday"][number]>
                  caption="Konsumsi token per pengguna hari ini"
                  rows={usageStats.byUserToday}
                  getRowKey={(item) => item.userId}
                  empty={{ icon: BarChart3, title: "Belum ada penggunaan hari ini", description: "Statistik akan muncul setelah pengguna mulai mengobrol." }}
                  columns={[
                    {
                      key: "user",
                      header: "Pengguna",
                      render: (item) => {
                        const user = users.find((u) => u.id === item.userId);
                        return (
                          <div>
                            <span className="block font-medium text-foreground">{user?.name || "Pengguna tidak dikenal"}</span>
                            <span className="block text-xs text-muted-foreground">{user?.email || item.userId}</span>
                          </div>
                        );
                      },
                    },
                    { key: "messages", header: "Pesan", align: "right", render: (item) => <span className="text-xs">{item.messageCount.toLocaleString("id-ID")}</span> },
                    { key: "in", header: "Token In", align: "right", hideOnMobile: true, render: (item) => <span className="text-xs text-muted-foreground">{item.inputTokens.toLocaleString("id-ID")}</span> },
                    { key: "out", header: "Token Out", align: "right", hideOnMobile: true, render: (item) => <span className="text-xs text-muted-foreground">{item.outputTokens.toLocaleString("id-ID")}</span> },
                    { key: "total", header: "Total", align: "right", render: (item) => <span className="text-xs font-semibold text-foreground">{item.totalTokens.toLocaleString("id-ID")}</span> },
                    {
                      key: "quota",
                      header: "Kuota Harian",
                      align: "right",
                      render: (item) => {
                        const pct = Math.min(100, Math.round((item.messageCount / settings.maxMessagesPerUserPerDay) * 100));
                        const barColor = pct > 90 ? "bg-destructive" : pct > 70 ? "bg-[#9a6700]" : "bg-primary";
                        return (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[11px] font-medium text-foreground tabular-nums">
                              {item.messageCount}/{settings.maxMessagesPerUserPerDay} ({pct}%)
                            </span>
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      },
                    },
                  ]}
                />
              </div>

              <div className="space-y-3">
                <SectionHeading title="Log Penggunaan Terbaru" />
                <DataTable<UsageStats["todayEvents"][number]>
                  caption="Log penggunaan token terbaru hari ini"
                  rows={usageStats.todayEvents}
                  getRowKey={(e) => e.id}
                  empty={{ icon: Clock, title: "Belum ada log hari ini" }}
                  columns={[
                    { key: "time", header: "Waktu", render: (e) => <span className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span> },
                    {
                      key: "user",
                      header: "User",
                      render: (e) => {
                        const user = users.find((u) => u.id === e.userId);
                        return (
                          <div>
                            <span className="block max-w-[150px] truncate font-medium text-foreground">{user?.name || "Tidak dikenal"}</span>
                            <span className="block max-w-[150px] truncate text-[11px] text-muted-foreground">{user?.email || e.userId}</span>
                          </div>
                        );
                      },
                    },
                    { key: "model", header: "Model", hideOnMobile: true, render: (e) => <span className="text-xs text-foreground">{getModelLabel(e.model || "") || e.model || "—"}</span> },
                    { key: "in", header: "Input", align: "right", hideOnMobile: true, render: (e) => <span className="text-xs text-muted-foreground">{e.inputTokens.toLocaleString("id-ID")}</span> },
                    { key: "out", header: "Output", align: "right", hideOnMobile: true, render: (e) => <span className="text-xs text-muted-foreground">{e.outputTokens.toLocaleString("id-ID")}</span> },
                    { key: "total", header: "Total", align: "right", render: (e) => <span className="text-xs font-semibold text-foreground">{(e.inputTokens + e.outputTokens).toLocaleString("id-ID")}</span> },
                  ]}
                />
              </div>
            </div>
          )}

          {/* KNOWLEDGE BASE */}
          {activeTab === "knowledge" && (
            <div className="space-y-4">
              <SearchInput
                label="Cari pengetahuan"
                placeholder="Cari judul, isi, tag, atau pemilik…"
                value={knowledgeSearch}
                onChange={setKnowledgeSearch}
              />
              <DataTable<AdminKnowledgeEntry>
                caption="Knowledge base semua pengguna"
                rows={filteredKnowledge}
                getRowKey={(e) => e.id}
                isLoading={loadingKnowledge}
                error={knowledgeError}
                onRetry={fetchKnowledge}
                empty={{ icon: BookOpen, title: "Belum ada pengetahuan", description: "Entri yang disimpan pengguna akan muncul di sini." }}
                columns={[
                  {
                    key: "title",
                    header: "Judul & Ringkasan",
                    render: (e) => (
                      <div className="max-w-md">
                        <span className="block truncate font-medium text-foreground">{e.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{e.contentPreview}</span>
                        {e.tags ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {e.tags
                              .split(",")
                              .map((t) => t.trim())
                              .filter(Boolean)
                              .slice(0, 4)
                              .map((tag) => (
                                <span key={tag} className="rounded-full bg-muted2 px-2 py-0.5 text-[10px] text-muted-foreground">
                                  {tag}
                                </span>
                              ))}
                          </div>
                        ) : null}
                      </div>
                    ),
                  },
                  {
                    key: "owner",
                    header: "Pemilik",
                    hideOnMobile: true,
                    render: (e) =>
                      e.isGlobal ? (
                        <StatusPill tone="info">Global</StatusPill>
                      ) : (
                        <div>
                          <span className="block text-sm text-foreground">{e.userName || "—"}</span>
                          <span className="block text-xs text-muted-foreground">{e.userEmail ?? "—"}</span>
                        </div>
                      ),
                  },
                  {
                    key: "chars",
                    header: "Karakter",
                    align: "right",
                    hideOnMobile: true,
                    render: (e) => <span className="text-xs text-muted-foreground">{e.contentLength.toLocaleString("id-ID")}</span>,
                  },
                  {
                    key: "status",
                    header: "Status",
                    align: "center",
                    render: (e) => (
                      <div className="flex items-center justify-center gap-2">
                        <Toggle
                          label={`Aktifkan pengetahuan ${e.title}`}
                          checked={e.enabled}
                          disabled={actionKnowledgeId !== null}
                          onChange={(v) => handleToggleKnowledge(e.id, v)}
                        />
                        <StatusPill tone={e.enabled ? "success" : "neutral"}>{e.enabled ? "Aktif" : "Nonaktif"}</StatusPill>
                      </div>
                    ),
                  },
                  {
                    key: "updated",
                    header: "Diperbarui",
                    hideOnMobile: true,
                    render: (e) => (
                      <span className="text-xs text-muted-foreground">
                        {new Date(e.updatedAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                      </span>
                    ),
                  },
                  {
                    key: "actions",
                    header: "Aksi",
                    align: "right",
                    render: (e) => (
                      <div className="flex items-center justify-end gap-1">
                        <IconButton
                          label="Edit pengetahuan"
                          disabled={actionKnowledgeId !== null}
                          onClick={() => openEditKnowledge(e)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </IconButton>
                        <IconButton
                          label="Hapus pengetahuan"
                          tone="danger"
                          disabled={actionKnowledgeId !== null}
                          onClick={() => handleDeleteKnowledge(e.id)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </IconButton>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* AI Defaults */}
                <Card className="space-y-5 p-6">
                  <SectionHeading title="Default AI" description="Model dan parameter dasar untuk semua pengguna." />
                  <Field label="Model Default" htmlFor="set-model">
                    <Select id="set-model" value={settings.defaultModel} onChange={(e) => setSettings((p) => ({ ...p, defaultModel: e.target.value }))}>
                      {MODEL_OPTIONS.map((m) => (
                        <option key={m} value={m}>{getModelLabel(m) || m}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={`Temperature — ${settings.defaultTemperature.toFixed(1)}`} htmlFor="set-temp" hint="0 = deterministik, 2 = paling kreatif.">
                    <input
                      id="set-temp"
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={settings.defaultTemperature}
                      onChange={(e) => setSettings((p) => ({ ...p, defaultTemperature: Number(e.target.value) }))}
                      className="w-full accent-primary"
                    />
                  </Field>
                </Card>

                {/* Policies & Quota */}
                <Card className="space-y-5 p-6">
                  <SectionHeading title="Kebijakan & Kuota" description="Batasan penggunaan tingkat sistem." />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Max pesan / chat" htmlFor="set-mmc">
                      <NumberInput id="set-mmc" min={1} max={1000} value={settings.maxMessagesPerChat} onChange={(e) => setSettings((p) => ({ ...p, maxMessagesPerChat: parseInt(e.target.value) || 100 }))} />
                    </Field>
                    <Field label="Max karakter prompt" htmlFor="set-mpl">
                      <NumberInput id="set-mpl" min={10} max={100000} value={settings.maxPromptLength} onChange={(e) => setSettings((p) => ({ ...p, maxPromptLength: parseInt(e.target.value) || 4000 }))} />
                    </Field>
                    <Field label="Max pesan / user / hari" htmlFor="set-mmu">
                      <NumberInput id="set-mmu" min={1} max={10000} value={settings.maxMessagesPerUserPerDay} onChange={(e) => setSettings((p) => ({ ...p, maxMessagesPerUserPerDay: parseInt(e.target.value) || 50 }))} />
                    </Field>
                    <Field label="Rate limit / menit" htmlFor="set-rl">
                      <NumberInput id="set-rl" min={1} max={1000} value={settings.rateLimitMessagesPerMinute} onChange={(e) => setSettings((p) => ({ ...p, rateLimitMessagesPerMinute: parseInt(e.target.value) || 10 }))} />
                    </Field>
                  </div>
                  <div className="divide-y divide-border border-t border-border">
                    <SettingRow
                      title="Izinkan pendaftaran baru"
                      description="Jika mati, pengguna baru tidak bisa registrasi."
                      checked={settings.registrationEnabled}
                      onChange={(v) => setSettings((p) => ({ ...p, registrationEnabled: v }))}
                    />
                    <SettingRow
                      title="Izinkan berbagi percakapan"
                      description="Jika mati, tombol bagikan publik disembunyikan."
                      checked={settings.sharingEnabled}
                      onChange={(v) => setSettings((p) => ({ ...p, sharingEnabled: v }))}
                    />
                  </div>
                </Card>
              </div>

              {/* AI Tools & Guardrails (NEW) */}
              <Card className="space-y-5 p-6">
                <SectionHeading
                  title="AI Tools & Guardrails"
                  description="Kontrol fungsi yang boleh dipanggil AI secara otomatis, dan pasang pengaman."
                />

                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-primary" aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tools</span>
                    </div>
                    <div className="mt-1 divide-y divide-border">
                      <SettingRow
                        title="Aktifkan AI Tools (master)"
                        description="Saklar utama. Jika mati, AI tidak memanggil fungsi apa pun."
                        checked={settings.toolsEnabled}
                        onChange={(v) => setSettings((p) => ({ ...p, toolsEnabled: v }))}
                      />
                      <SettingRow
                        title="Generate Gambar"
                        description="Izinkan AI memanggil generate_image saat diminta gambar."
                        checked={settings.imageToolEnabled}
                        onChange={(v) => setSettings((p) => ({ ...p, imageToolEnabled: v }))}
                        disabled={!settings.toolsEnabled}
                      />
                      <SettingRow
                        title="Cari Knowledge Base"
                        description="Izinkan AI mencari basis pengetahuan pengguna."
                        checked={settings.knowledgeToolEnabled}
                        onChange={(v) => setSettings((p) => ({ ...p, knowledgeToolEnabled: v }))}
                        disabled={!settings.toolsEnabled}
                      />
                      <SettingRow
                        title="Simpan Memory"
                        description="Izinkan AI menyimpan fakta jangka panjang pengguna."
                        checked={settings.memoryToolEnabled}
                        onChange={(v) => setSettings((p) => ({ ...p, memoryToolEnabled: v }))}
                        disabled={!settings.toolsEnabled}
                      />
                    </div>
                    <div className="mt-4">
                      <Field label="Maks. pemanggilan tool / pesan" htmlFor="set-mtc" hint="Batas anti-loop untuk setiap pesan (0–20).">
                        <NumberInput
                          id="set-mtc"
                          min={0}
                          max={20}
                          value={settings.maxToolCallsPerMessage}
                          onChange={(e) => setSettings((p) => ({ ...p, maxToolCallsPerMessage: Math.max(0, Math.min(20, parseInt(e.target.value) || 0)) }))}
                          disabled={!settings.toolsEnabled}
                        />
                      </Field>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted2 px-2.5 py-0.5 text-[11px] text-muted-foreground"><ImageIcon className="h-3 w-3" aria-hidden /> generate_image</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted2 px-2.5 py-0.5 text-[11px] text-muted-foreground"><BookOpen className="h-3 w-3" aria-hidden /> search_knowledge</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted2 px-2.5 py-0.5 text-[11px] text-muted-foreground"><Brain className="h-3 w-3" aria-hidden /> save_memory</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guardrails</span>
                    </div>
                    <div className="mt-1 divide-y divide-border">
                      <SettingRow
                        title="Aktifkan Guardrails"
                        description="Saring input pengguna terhadap daftar kata terblokir."
                        checked={settings.guardrailsEnabled}
                        onChange={(v) => setSettings((p) => ({ ...p, guardrailsEnabled: v }))}
                      />
                    </div>
                    <div className="mt-4">
                      <Field
                        label="Kata/frasa terblokir"
                        htmlFor="set-blocked"
                        hint="Pisahkan dengan koma. Pesan yang mengandung salah satunya akan ditolak."
                      >
                        <Textarea
                          id="set-blocked"
                          rows={5}
                          value={settings.blockedKeywords ?? ""}
                          onChange={(e) => setSettings((p) => ({ ...p, blockedKeywords: e.target.value }))}
                          placeholder="mis. kata1, frasa terlarang, kata2"
                          disabled={!settings.guardrailsEnabled}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Global system prompt + save */}
              <Card className="space-y-5 p-6">
                <SectionHeading title="System Prompt Global" description="Instruksi dasar yang dipakai bila pengguna tidak menyetel sendiri." />
                <Field label="Global System Prompt" htmlFor="set-sysprompt">
                  <Textarea
                    id="set-sysprompt"
                    rows={4}
                    value={settings.defaultSystemPrompt}
                    onChange={(e) => setSettings((p) => ({ ...p, defaultSystemPrompt: e.target.value }))}
                    placeholder="Contoh: You are a helpful personal AI assistant…"
                  />
                </Field>
                <div className="flex justify-end">
                  <Button type="submit" variant="primary" disabled={isSavingSettings}>
                    {isSavingSettings ? "Menyimpan…" : "Simpan Setelan Global"}
                  </Button>
                </div>
              </Card>
            </form>
          )}

          {/* MAINTENANCE */}
          {activeTab === "maintenance" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="flex flex-col justify-between p-6">
                <div>
                  <SectionHeading title="Smoke Test Observabilitas" description="Verifikasi konektivitas database PostgreSQL dan API key Gemini." />
                  {healthError ? (
                    <div role="alert" className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs font-medium text-destructive">
                      {healthError}
                    </div>
                  ) : null}
                  {healthData ? (
                    <dl className="mt-4 space-y-2">
                      <div className="flex items-center justify-between rounded-lg border border-border bg-accent/40 px-3 py-2 text-sm">
                        <dt className="text-muted-foreground">Status API</dt>
                        <dd><StatusPill tone="success">{String(healthData.status ?? "ok").toUpperCase()}</StatusPill></dd>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border bg-accent/40 px-3 py-2 text-sm">
                        <dt className="text-muted-foreground">Latensi DB</dt>
                        <dd className="font-semibold tabular-nums text-foreground">{healthData.database?.latencyMs} ms</dd>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border bg-accent/40 px-3 py-2 text-sm">
                        <dt className="text-muted-foreground">Lingkungan</dt>
                        <dd className="font-medium capitalize text-foreground">{healthData.environment}</dd>
                      </div>
                    </dl>
                  ) : !healthError ? (
                    <p className="mt-4 text-xs text-muted-foreground">Menjalankan pemeriksaan…</p>
                  ) : null}
                </div>
                <Button variant="primary" className="mt-6 w-full" onClick={fetchHealth} disabled={isCheckingHealth}>
                  <RefreshCw className={`h-4 w-4 ${isCheckingHealth ? "animate-spin" : ""}`} aria-hidden />
                  Jalankan Health Check
                </Button>
              </Card>

              <Card className="space-y-3 p-6">
                <SectionHeading title="Payload Respons Mentah" description="Output JSON dari endpoint health." />
                <div className="max-h-72 overflow-auto rounded-xl border border-border bg-accent/40 p-4">
                  {healthData ? (
                    <pre className="font-mono text-xs text-foreground">{JSON.stringify(healthData, null, 2)}</pre>
                  ) : (
                    <EmptyState icon={Server} title="Belum ada data" description="Jalankan health check untuk melihat respons." />
                  )}
                </div>
              </Card>
            </div>
          )}
        </section>
      </div>

      {dialog}
      <KnowledgeFormModal
        open={knowledgeModalOpen}
        initial={knowledgeEditing}
        isSaving={savingKnowledge}
        onClose={() => {
          setKnowledgeModalOpen(false);
          setKnowledgeEditing(null);
        }}
        onSubmit={handleSubmitKnowledge}
      />
    </main>
  );
}
