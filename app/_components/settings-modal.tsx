"use client";

import { useEffect, useState } from "react";
import { BorderBeam } from "@/components/ui/border-beam";
import { Trash2, Edit3, Plus, BrainCircuit, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast-provider";
import { useModalAccessibility } from "../_hooks/use-modal-accessibility";

export interface ChatSettings {
  defaultModel: string;
  /** Null means "follow admin global system prompt" */
  systemPrompt: string | null;
  temperature: number;
}

interface SettingsModalProps {
  isOpen: boolean;
  settings: ChatSettings;
  isSaving: boolean;
  onClose: () => void;
  onSave: (settings: ChatSettings) => Promise<void> | void;
  onClearChats: () => void;
  isAuthenticated: boolean;
  onLoginClick: () => void;
}

interface Memory {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

const MODEL_OPTIONS = [
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

export function getModelLabel(model: string): string {
  return MODEL_OPTIONS.find((option) => option.value === model)?.label ?? model;
}

export function SettingsModal({
  isOpen,
  settings,
  isSaving,
  onClose,
  onSave,
  onClearChats,
  isAuthenticated,
  onLoginClick,
}: SettingsModalProps): React.ReactElement | null {
  const { success: toastSuccess, error: toastError } = useToast();
  const { modalRef, handleBackdropClick } = useModalAccessibility(isOpen, onClose);
  const [activeTab, setActiveTab] = useState<"umum" | "memori" | "aktivitas">("umum");
  const [draft, setDraft] = useState<ChatSettings>(settings);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [localIsSaving, setLocalIsSaving] = useState<boolean>(false);

  // Memory states
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [memoryKey, setMemoryKey] = useState("");
  const [memoryValue, setMemoryValue] = useState("");
  const [isSavingMemory, setIsSavingMemory] = useState(false);

interface Activity {
  id: string;
  type: string;
  createdAt: string;
  metadata?: {
    email?: string;
    reason?: string;
    defaultModel?: string;
    conversationTitle?: string;
    filename?: string;
    sizeBytes?: number;
    [key: string]: unknown;
  } | null;
}

  // Activity states
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const fetchMemories = async () => {
    setLoadingMemories(true);
    setMemoryError(null);
    try {
      const res = await fetch("/api/memories");
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      } else {
        throw new Error("Gagal memuat memori AI.");
      }
    } catch (err) {
      setMemoryError((err as Error).message);
    } finally {
      setLoadingMemories(false);
    }
  };

  const fetchActivities = async () => {
    setLoadingActivities(true);
    setActivityError(null);
    try {
      const res = await fetch("/api/activity");
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      } else {
        throw new Error("Gagal memuat log aktivitas.");
      }
    } catch (err) {
      setActivityError((err as Error).message);
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
      setConfirmClear(false);
      setValidationError(null);
      setSuccess(false);
      setActiveTab("umum");
      setIsAddingMemory(false);
      setEditingMemoryId(null);
      setMemoryKey("");
      setMemoryValue("");
    }
  }, [isOpen, settings]);

  useEffect(() => {
    if (isOpen && activeTab === "memori" && isAuthenticated) {
      void fetchMemories();
    }
  }, [isOpen, activeTab, isAuthenticated]);

  useEffect(() => {
    if (isOpen && activeTab === "aktivitas" && isAuthenticated) {
      void fetchActivities();
    }
  }, [isOpen, activeTab, isAuthenticated]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setValidationError(null);
    setSuccess(false);

    if (!isAuthenticated) {
      onLoginClick();
      return;
    }

    if (!draft.defaultModel.trim()) {
      setValidationError("Model harus dipilih.");
      return;
    }

    // Allow empty system prompt — empty means "follow global admin setting"
    if (draft.systemPrompt !== null && draft.systemPrompt.length > 4000) {
      setValidationError("System prompt maksimal 4000 karakter.");
      return;
    }

    if (draft.temperature < 0 || draft.temperature > 2) {
      setValidationError("Temperature harus antara 0.0 dan 2.0.");
      return;
    }

    setLocalIsSaving(true);
    try {
      await onSave(draft);
      toastSuccess("Pengaturan berhasil disimpan!");
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      const msg = (err as Error).message || "Gagal menyimpan pengaturan.";
      toastError(msg);
      setValidationError(msg);
    } finally {
      setLocalIsSaving(false);
    }
  };

  const handleToggleMemory = async (id: string, currentEnabled: boolean) => {
    // Optimistic UI update
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !currentEnabled } : m))
    );

    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (!res.ok) {
        throw new Error("Gagal memperbarui status memori.");
      }
      toastSuccess(`Memori "${!currentEnabled ? "diaktifkan" : "dinonaktifkan"}"`);
    } catch (err) {
      console.error(err);
      toastError("Gagal memperbarui status memori.");
      // Revert on error
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? { ...m, enabled: currentEnabled } : m))
      );
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus memori ini?")) return;

    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
        toastSuccess("Memori berhasil dihapus.");
      } else {
        throw new Error("Gagal menghapus memori.");
      }
    } catch (err) {
      toastError((err as Error).message);
    }
  };

  const handleStartEditMemory = (m: Memory) => {
    setEditingMemoryId(m.id);
    setMemoryKey(m.key);
    setMemoryValue(m.value);
    setIsAddingMemory(false);
    setMemoryError(null);
  };

  const handleSaveMemoryForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoryKey.trim() || !memoryValue.trim()) {
      setMemoryError("Kunci dan Nilai memori wajib diisi.");
      return;
    }

    setIsSavingMemory(true);
    setMemoryError(null);

    try {
      const isEditing = !!editingMemoryId;
      const url = isEditing ? `/api/memories/${editingMemoryId}` : "/api/memories";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: memoryKey.trim(),
          value: memoryValue.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menyimpan memori.");
      }

      toastSuccess(isEditing ? "Memori berhasil diperbarui." : "Memori baru berhasil disimpan.");
      await fetchMemories();
      setIsAddingMemory(false);
      setEditingMemoryId(null);
      setMemoryKey("");
      setMemoryValue("");
    } catch (err) {
      const msg = (err as Error).message;
      toastError(msg);
      setMemoryError(msg);
    } finally {
      setIsSavingMemory(false);
    }
  };

  const showSaving = isSaving || localIsSaving;

  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#111] p-5 text-white shadow-2xl flex flex-col max-h-[85vh]">
        <BorderBeam
          size={110}
          duration={10}
          borderWidth={1.5}
          colorFrom="#a78bfa"
          colorTo="#22d3ee"
        />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BrainCircuit className="size-5 text-violet-400" />
              Settings
            </h2>
            <p className="mt-1 text-xs text-zinc-400">Atur model default dan memori asisten AI Anda.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-4 flex border-b border-white/10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("umum")}
            className={`pb-2.5 pr-4 transition border-b-2 ${
              activeTab === "umum"
                ? "text-violet-400 border-violet-400"
                : "text-zinc-400 border-transparent hover:text-white"
            }`}
          >
            Umum
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("memori")}
            className={`pb-2.5 px-4 transition border-b-2 ${
              activeTab === "memori"
                ? "text-violet-400 border-violet-400"
                : "text-zinc-400 border-transparent hover:text-white"
            }`}
          >
            Memori AI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("aktivitas")}
            className={`pb-2.5 px-4 transition border-b-2 ${
              activeTab === "aktivitas"
                ? "text-violet-400 border-violet-400"
                : "text-zinc-400 border-transparent hover:text-white"
            }`}
          >
            Aktivitas
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="mt-5 flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar min-h-0">
          {activeTab === "umum" ? (
            /* GENERAL TAB CONTENT */
            <div className="space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold text-zinc-300">Model</span>
                <select
                  value={draft.defaultModel}
                  onChange={(event) => setDraft((prev) => ({ ...prev, defaultModel: event.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-violet-400 transition"
                >
                  {MODEL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold text-zinc-300">System prompt</span>
                <textarea
                  value={draft.systemPrompt ?? ""}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      systemPrompt: event.target.value || null,
                    }))
                  }
                  rows={5}
                  maxLength={4200}
                  placeholder="Kosongkan untuk mengikuti System Prompt global dari Admin..."
                  className="w-full resize-y rounded-lg border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-violet-400 transition font-mono placeholder:text-zinc-600"
                />
                <div className="flex justify-end text-[10px] text-zinc-500">
                  {(draft.systemPrompt?.length ?? 0)}/4000 karakter
                </div>
              </label>

              <label className="block space-y-2">
                <span className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                  Temperature
                  <span className="text-zinc-400">{draft.temperature.toFixed(1)}</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={draft.temperature}
                  onChange={(event) => setDraft((prev) => ({ ...prev, temperature: Number(event.target.value) }))}
                  className="w-full accent-violet-400"
                />
              </label>

              {validationError && (
                <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300 font-medium">
                  {validationError}
                </p>
              )}

              {success && (
                <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 font-medium">
                  Pengaturan berhasil disimpan!
                </p>
              )}
            </div>
          ) : activeTab === "memori" ? (
            /* MEMORIES TAB CONTENT */
            <div className="space-y-3">
              {!isAuthenticated ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-zinc-400">Silakan masuk log terlebih dahulu untuk mengelola memori AI Anda.</p>
                  <button
                    onClick={() => {
                      onLoginClick();
                      onClose();
                    }}
                    className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold hover:bg-violet-700 transition"
                  >
                    Log In Sekarang
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-[280px]">
                      AI akan mengingat detail di bawah ini di semua obrolan berikutnya.
                    </p>
                    {!isAddingMemory && !editingMemoryId && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingMemory(true);
                          setEditingMemoryId(null);
                          setMemoryKey("");
                          setMemoryValue("");
                          setMemoryError(null);
                        }}
                        className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold hover:bg-violet-700 transition"
                      >
                        <Plus className="size-3.5" />
                        Tambah
                      </button>
                    )}
                  </div>

                  {memoryError && (
                    <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300 font-medium">
                      {memoryError}
                    </p>
                  )}

                  {/* Add/Edit Memory Form */}
                  {(isAddingMemory || editingMemoryId) && (
                    <form onSubmit={handleSaveMemoryForm} className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-violet-400">
                          {editingMemoryId ? "Edit Memori" : "Tambah Memori Baru"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingMemory(false);
                            setEditingMemoryId(null);
                          }}
                          className="text-[10px] text-zinc-400 hover:text-white"
                        >
                          Batal
                        </button>
                      </div>

                      <label className="block space-y-1">
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Kunci / Topik</span>
                        <input
                          type="text"
                          placeholder="Contoh: Nama saya, Pekerjaan, Bahasa favorit"
                          value={memoryKey}
                          onChange={(e) => setMemoryKey(e.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-black px-3 py-1.5 text-xs outline-none focus:border-violet-400 transition"
                        />
                      </label>

                      <label className="block space-y-1">
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Nilai / Detail</span>
                        <textarea
                          placeholder="Contoh: David Boy, Pengembang Web Fullstack, Typescript"
                          value={memoryValue}
                          onChange={(e) => setMemoryValue(e.target.value)}
                          rows={2}
                          className="w-full rounded-lg border border-white/10 bg-black px-3 py-1.5 text-xs outline-none focus:border-violet-400 transition"
                        />
                      </label>

                      <button
                        type="submit"
                        disabled={isSavingMemory}
                        className="w-full rounded-lg bg-violet-600 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition"
                      >
                        {isSavingMemory ? "Menyimpan..." : "Simpan Memori"}
                      </button>
                    </form>
                  )}

                  {/* Memories List */}
                  <div className="space-y-2">
                    {loadingMemories ? (
                      <div className="flex items-center justify-center py-6 text-xs text-zinc-400 gap-2">
                        <Loader2 className="size-4 animate-spin text-violet-400" />
                        Memuat memori...
                      </div>
                    ) : memories.length === 0 ? (
                      <div className="rounded-xl border border-white/5 border-dashed p-6 text-center text-xs text-zinc-500">
                        Belum ada memori AI yang disimpan.
                      </div>
                    ) : (
                      memories.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block text-xs font-bold text-zinc-200 truncate">{item.key}</span>
                            <span className="block text-[11px] text-zinc-400 truncate mt-0.5">{item.value}</span>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleMemory(item.id, item.enabled)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                item.enabled ? "bg-violet-600" : "bg-zinc-700"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  item.enabled ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEditMemory(item)}
                              className="p-1 rounded text-zinc-400 hover:bg-white/10 hover:text-white transition"
                              title="Edit memori"
                            >
                              <Edit3 className="size-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteMemory(item.id)}
                              className="p-1 rounded text-zinc-400 hover:bg-white/10 hover:text-red-400 transition"
                              title="Hapus memori"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* ACTIVITIES TAB CONTENT */
            <div className="space-y-3">
              {!isAuthenticated ? (
                <div className="py-6 text-center">
                  <p className="text-xs text-zinc-400">Silakan masuk log terlebih dahulu untuk melihat aktivitas Anda.</p>
                  <button
                    onClick={() => {
                      onLoginClick();
                      onClose();
                    }}
                    className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold hover:bg-violet-700 transition"
                  >
                    Log In Sekarang
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Log aktivitas keamanan dan konfigurasi akun Anda selama 30 hari terakhir.
                  </p>

                  {activityError && (
                    <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300 font-medium">
                      {activityError}
                    </p>
                  )}

                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                    {loadingActivities ? (
                      <div className="flex items-center justify-center py-8 text-xs text-zinc-400 gap-2">
                        <Loader2 className="size-4 animate-spin text-violet-400" />
                        Memuat aktivitas...
                      </div>
                    ) : activities.length === 0 ? (
                      <div className="rounded-xl border border-white/5 border-dashed p-6 text-center text-xs text-zinc-500">
                        Belum ada riwayat aktivitas yang tercatat.
                      </div>
                    ) : (
                      activities.map((act) => {
                        let displayType = act.type;
                        let colorClass = "text-zinc-300";
                        let detailString = "";

                        if (act.type === "login_success") {
                          displayType = "Masuk Log Berhasil";
                          colorClass = "text-emerald-400 font-semibold";
                          detailString = act.metadata?.email ? `Email: ${act.metadata.email}` : "";
                        } else if (act.type === "login_failed") {
                          displayType = "Masuk Log Gagal";
                          colorClass = "text-red-400 font-semibold";
                          detailString = act.metadata?.email ? `Email: ${act.metadata.email} (${act.metadata.reason || ""})` : "";
                        } else if (act.type === "register_success") {
                          displayType = "Registrasi Akun Baru";
                          colorClass = "text-violet-400 font-semibold";
                          detailString = act.metadata?.email ? `Email: ${act.metadata.email}` : "";
                        } else if (act.type === "register_failed") {
                          displayType = "Registrasi Gagal";
                          colorClass = "text-red-400 font-semibold";
                          detailString = act.metadata?.email ? `Email: ${act.metadata.email} (${act.metadata.reason || ""})` : "";
                        } else if (act.type === "settings_saved") {
                          displayType = "Pengaturan Disimpan";
                          colorClass = "text-blue-400 font-semibold";
                          detailString = `Model: ${act.metadata?.defaultModel ?? ""}`;
                        } else if (act.type === "share_enabled") {
                          displayType = "Membagikan Percakapan";
                          colorClass = "text-teal-400 font-semibold";
                          detailString = act.metadata?.conversationTitle ? `"${act.metadata.conversationTitle}"` : "";
                        } else if (act.type === "share_disabled") {
                          displayType = "Menghentikan Berbagi";
                          colorClass = "text-amber-400 font-semibold";
                          detailString = act.metadata?.conversationTitle ? `"${act.metadata.conversationTitle}"` : "";
                        } else if (act.type === "file_uploaded") {
                          displayType = "Mengunggah File";
                          colorClass = "text-indigo-400 font-semibold";
                          const size = typeof act.metadata?.sizeBytes === "number" ? act.metadata.sizeBytes : 0;
                          detailString = act.metadata?.filename ? `${act.metadata.filename} (${(size / 1024).toFixed(1)} KB)` : "";
                        }

                        return (
                          <div
                            key={act.id}
                            className="flex items-start justify-between p-3 rounded-xl border border-white/5 bg-white/[0.01] text-xs hover:bg-white/[0.02] transition"
                          >
                            <div className="min-w-0 pr-4">
                              <span className={`block font-bold ${colorClass}`}>{displayType}</span>
                              {detailString && (
                                <span className="block text-[10px] text-zinc-400 mt-0.5 truncate">
                                  {detailString}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 shrink-0 mt-0.5">
                              {new Date(act.createdAt).toLocaleString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "short",
                              })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {activeTab === "umum" && isAuthenticated ? (
              confirmClear ? (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-900/10 p-1.5">
                  <span className="text-xs text-red-300">Yakin hapus semua?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClearChats();
                      setConfirmClear(false);
                    }}
                    className="rounded bg-red-500 px-2 py-1 text-xs font-semibold text-white hover:bg-red-600 transition"
                  >
                    Ya, Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="rounded border border-white/10 px-2 py-1 text-xs text-zinc-300 hover:bg-white/10 transition"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 transition"
                >
                  Clear all chats
                </button>
              )
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            {activeTab === "umum" ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-xs text-zinc-300 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={showSaving}
                  onClick={handleSave}
                  className="rounded-lg bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-60 transition"
                >
                  {showSaving ? "Saving..." : isAuthenticated ? "Save" : "Login untuk menyimpan"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition"
              >
                Selesai
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
