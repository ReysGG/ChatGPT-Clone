"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button, Field, TextInput, Textarea, Toggle } from "./primitives";

export interface KnowledgeFormValues {
  title: string;
  content: string;
  tags: string;
  enabled: boolean;
}

export interface KnowledgeInitial {
  title: string;
  content: string;
  tags: string | null;
  enabled: boolean;
}

interface KnowledgeFormModalProps {
  open: boolean;
  /** Provide an entry to edit, or null/undefined to create a new one. */
  initial?: KnowledgeInitial | null;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: KnowledgeFormValues) => void;
}

const EMPTY: KnowledgeFormValues = { title: "", content: "", tags: "", enabled: true };

export function KnowledgeFormModal({ open, initial, isSaving, onClose, onSubmit }: KnowledgeFormModalProps) {
  const [values, setValues] = useState<KnowledgeFormValues>(EMPTY);
  const titleRef = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(initial);

  // Reset the form whenever the modal opens (with or without an entry).
  useEffect(() => {
    if (!open) return;
    setValues(
      initial
        ? { title: initial.title, content: initial.content, tags: initial.tags ?? "", enabled: initial.enabled }
        : EMPTY
    );
    const id = window.setTimeout(() => titleRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canSubmit = values.title.trim().length > 0 && values.content.trim().length > 0 && !isSaving;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kb-form-title"
    >
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="kb-form-title" className="text-base font-semibold text-foreground">
            {isEdit ? "Edit Pengetahuan" : "Tambah Pengetahuan"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onSubmit(values);
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="space-y-4 overflow-y-auto px-6 py-5">
            <Field label="Judul" htmlFor="kb-title">
              <TextInput
                id="kb-title"
                ref={titleRef as React.Ref<HTMLInputElement>}
                value={values.title}
                maxLength={200}
                onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
                placeholder="mis. Jam operasional"
              />
            </Field>
            <Field label="Isi Pengetahuan" htmlFor="kb-content" hint="Informasi yang akan dicari & dipakai AI saat relevan.">
              <Textarea
                id="kb-content"
                rows={8}
                value={values.content}
                maxLength={20000}
                onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
                placeholder="Tulis fakta, kebijakan, atau info produk di sini…"
              />
            </Field>
            <Field label="Tag (opsional)" htmlFor="kb-tags" hint="Pisahkan dengan koma.">
              <TextInput
                id="kb-tags"
                value={values.tags}
                maxLength={300}
                onChange={(e) => setValues((v) => ({ ...v, tags: e.target.value }))}
                placeholder="mis. faq, produk, kebijakan"
              />
            </Field>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div>
                <p className="text-sm font-medium text-foreground">Aktif</p>
                <p className="text-xs text-muted-foreground">Jika nonaktif, AI tidak memakai entri ini.</p>
              </div>
              <Toggle label="Aktifkan pengetahuan" checked={values.enabled} onChange={(v) => setValues((s) => ({ ...s, enabled: v }))} />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={!canSubmit}>
              {isSaving ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Tambah"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
