"use client";

import { useEffect, useState } from "react";
import { X, Search, Plus, Trash2, Edit3, Sparkles, Send, FileText, Check } from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";
import type { AuthSession } from "../_hooks/use-chat-state";
import { useModalAccessibility } from "../_hooks/use-modal-accessibility";

interface PromptTemplate {
  id: string;
  title: string;
  body: string;
  category: string;
  isGlobal: boolean;
  userId?: string | null;
}

interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (body: string) => void;
  onSend: (body: string) => void;
  session: AuthSession;
  onLoginClick: () => void;
}

const CATEGORIES = ["Semua", "Umum", "Coding", "Writing", "Pribadi"];

const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: "default-1",
    title: "Debug Kode Error",
    body: "Saya memiliki kode JavaScript/TypeScript berikut yang mengalami error. Tolong jelaskan kenapa error ini terjadi dan berikan perbaikan kodenya:\n\n```\n// Masukkan kode Anda di sini\n```",
    category: "Coding",
    isGlobal: true,
  },
  {
    id: "default-2",
    title: "Penerjemah Anak Jaksel",
    body: "Tolong terjemahkan kalimat berikut ke dalam bahasa gaul Jakarta (anak Jaksel) yang penuh campuran bahasa Inggris santai:\n\n\"[Kalimat Anda]\"",
    category: "Writing",
    isGlobal: true,
  },
  {
    id: "default-3",
    title: "Pembuat Ringkasan Rapat",
    body: "Tolong buat ringkasan rapat yang terstruktur dari transkrip percakapan berikut. Buat poin-poin keputusan penting dan daftar rencana aksi (action items) yang jelas:\n\n[Transkrip Rapat]",
    category: "Umum",
    isGlobal: true,
  },
  {
    id: "default-4",
    title: "Email Bisnis Profesional",
    body: "Tulis ulang draf email berikut agar terdengar lebih profesional, sopan, formal, dan persuasif, namun tetap singkat dan jelas:\n\n\"[Draf email Anda]\"",
    category: "Writing",
    isGlobal: true,
  },
  {
    id: "default-5",
    title: "Penjelas Konsep Sulit",
    body: "Jelaskan konsep berikut kepada saya seolah-olah saya adalah anak berusia 10 tahun. Gunakan analogi sederhana dan menyenangkan yang mudah diingat:\n\n[Konsep/Topik]",
    category: "Umum",
    isGlobal: true,
  },
];

export function PromptLibraryModal({
  isOpen,
  onClose,
  onInsert,
  onSend,
  session,
  onLoginClick,
}: PromptLibraryModalProps): React.ReactElement | null {
  const { modalRef, handleBackdropClick } = useModalAccessibility(isOpen, onClose);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  
  // Form states (Add / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formCategory, setFormCategory] = useState("Umum");
  const [formIsGlobal, setFormIsGlobal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      void fetchTemplates();
      setSelectedTemplate(null);
      setIsFormOpen(false);
      setEditingTemplate(null);
    }
  }, [isOpen]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const response = await fetch("/api/prompt-templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to load templates", error);
    } finally {
      setLoading(false);
    }
  }

  // Merge default templates with user templates
  const allTemplates = [...DEFAULT_TEMPLATES, ...templates];

  // Filter templates
  const filteredTemplates = allTemplates.filter((template) => {
    const matchesSearch =
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.body.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedCategory === "Semua") return matchesSearch;
    if (selectedCategory === "Pribadi") {
      return matchesSearch && template.userId === session.userId && !template.isGlobal;
    }
    return matchesSearch && template.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const handleOpenAddForm = () => {
    if (!session.isAuthenticated) {
      onLoginClick();
      return;
    }
    setEditingTemplate(null);
    setFormTitle("");
    setFormBody("");
    setFormCategory("Umum");
    setFormIsGlobal(false);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (template: PromptTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate(template);
    setFormTitle(template.title);
    setFormBody(template.body);
    setFormCategory(template.category);
    setFormIsGlobal(template.isGlobal);
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formBody.trim()) {
      setFormError("Judul dan isi prompt wajib diisi");
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const isEditing = !!editingTemplate;
      const url = isEditing
        ? `/api/prompt-templates/${editingTemplate.id}`
        : "/api/prompt-templates";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          body: formBody.trim(),
          category: formCategory,
          isGlobal: session.role === "admin" ? formIsGlobal : false,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Gagal menyimpan template");
      }

      await fetchTemplates();
      setIsFormOpen(false);
      setSelectedTemplate(null);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Apakah Anda yakin ingin menghapus template ini?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/prompt-templates/${templateId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Gagal menghapus template");
      }

      await fetchTemplates();
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
      }
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const isAdmin = session.role === "admin";

  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
    >
      <div className="relative flex h-[80vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#111] text-white shadow-2xl">
        <BorderBeam
          size={150}
          duration={10}
          borderWidth={1.5}
          colorFrom="#a78bfa"
          colorTo="#22d3ee"
        />

        {/* Modal Left Pane: Template List & Search */}
        <div className="flex w-7/12 flex-col border-r border-white/5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="size-5 text-violet-400" />
              Pustaka Prompt
            </h2>
            <button
              onClick={handleOpenAddForm}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold hover:bg-violet-700 transition"
            >
              <Plus className="size-3.5" />
              Buat Baru
            </button>
          </div>

          {/* Search bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari template prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 py-2 pl-10 pr-4 text-sm outline-none focus:border-violet-500/50"
            />
          </div>

          {/* Category Pills */}
          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => {
              if (cat === "Pribadi" && !session.isAuthenticated) return null;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-medium transition ${
                    isSelected
                      ? "bg-white text-black"
                      : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* List items */}
          <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loading ? (
              <div className="flex h-32 items-center justify-center text-sm text-zinc-400">
                Memuat template...
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-sm text-zinc-500">
                <FileText className="size-8 mb-2 opacity-50" />
                Tidak ada template ditemukan.
              </div>
            ) : (
              filteredTemplates.map((item) => {
                const isSelected = selectedTemplate?.id === item.id;
                const isDefault = item.id.startsWith("default-");
                const canManage = !isDefault && (item.userId === session.userId || isAdmin);
                
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedTemplate(item);
                      setIsFormOpen(false);
                    }}
                    className={`group relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition ${
                      isSelected
                        ? "border-violet-500/40 bg-violet-950/20"
                        : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold group-hover:text-violet-300 transition">
                          {item.title}
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-300 font-medium">
                            {item.category}
                          </span>
                          {item.isGlobal ? (
                            <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] text-blue-300 font-medium border border-blue-500/20">
                              Global
                            </span>
                          ) : (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300 font-medium border border-amber-500/20">
                              Pribadi
                            </span>
                          )}
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleOpenEditForm(item, e)}
                            className="p-1 rounded text-zinc-400 hover:bg-white/10 hover:text-white"
                            title="Edit template"
                          >
                            <Edit3 className="size-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteTemplate(item.id, e)}
                            disabled={isDeleting}
                            className="p-1 rounded text-zinc-400 hover:bg-white/10 hover:text-red-400 disabled:opacity-50"
                            title="Hapus template"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                      {item.body}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Right Pane: Detail Preview OR Add/Edit Form */}
        <div className="flex w-5/12 flex-col bg-black/20 p-5 relative">
          {/* Close button inside modal right-corner */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="size-5" />
          </button>

          {isFormOpen ? (
            /* ADD / EDIT TEMPLATE FORM */
            <form onSubmit={handleSaveTemplate} className="flex h-full flex-col justify-between pt-8">
              <div className="space-y-4">
                <h3 className="text-md font-semibold text-violet-300">
                  {editingTemplate ? "Edit Template" : "Buat Template Baru"}
                </h3>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-zinc-400">Judul</span>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pembuat Email"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm outline-none focus:border-violet-500/50"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-zinc-400">Kategori</span>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm outline-none focus:border-violet-500/50"
                    >
                      <option value="Umum">Umum</option>
                      <option value="Coding">Coding</option>
                      <option value="Writing">Writing</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </label>

                  {isAdmin && (
                    <label className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        checked={formIsGlobal}
                        onChange={(e) => setFormIsGlobal(e.target.checked)}
                        className="rounded border-white/10 bg-black/60 text-violet-500 focus:ring-0 focus:ring-offset-0 size-4"
                      />
                      <span className="text-xs font-semibold text-zinc-400">Template Global</span>
                    </label>
                  )}
                </div>

                <label className="block space-y-1">
                  <span className="text-xs font-semibold text-zinc-400">Isi Prompt</span>
                  <textarea
                    required
                    rows={8}
                    placeholder="Tulis instruksi prompt Anda di sini..."
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs outline-none focus:border-violet-500/50 resize-none font-mono"
                  />
                </label>

                {formError && <p className="text-xs text-red-400 font-medium">{formError}</p>}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 rounded-lg border border-white/10 py-2 text-xs font-semibold hover:bg-white/5 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 rounded-lg bg-violet-600 py-2 text-xs font-semibold hover:bg-violet-700 disabled:opacity-60 transition"
                >
                  {isSaving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          ) : selectedTemplate ? (
            /* DETAILED PREVIEW */
            <div className="flex h-full flex-col justify-between pt-8">
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-zinc-300 font-medium">
                      {selectedTemplate.category}
                    </span>
                    {selectedTemplate.isGlobal && (
                      <span className="rounded bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300 font-medium border border-blue-500/20">
                        Global
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-white leading-tight">
                    {selectedTemplate.title}
                  </h3>
                </div>

                <div className="rounded-xl border border-white/5 bg-black/40 p-4 font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-[30vh] overflow-y-auto">
                  {selectedTemplate.body}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    onInsert(selectedTemplate.body);
                    onClose();
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-xs font-semibold hover:bg-white/10 hover:text-white transition"
                >
                  <FileText className="size-4" />
                  Salin ke Chat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSend(selectedTemplate.body);
                    onClose();
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-3 text-xs font-semibold text-black hover:bg-zinc-200 transition"
                >
                  <Send className="size-4" />
                  Kirim Langsung
                </button>
              </div>
            </div>
          ) : (
            /* NO SELECTION VIEW */
            <div className="flex h-full flex-col items-center justify-center text-center p-6 pt-12 text-zinc-500">
              <Sparkles className="size-12 mb-3 text-zinc-700 animate-pulse" />
              <h3 className="text-sm font-semibold text-zinc-400">Pilih Template Prompt</h3>
              <p className="mt-1 text-xs text-zinc-500 max-w-[200px] leading-relaxed">
                Pilih salah satu template di panel kiri untuk melihat isi prompt dan menggunakannya.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
