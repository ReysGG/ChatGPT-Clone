"use client";

import { useEffect, useState } from "react";
import { BorderBeam } from "@/components/ui/border-beam";

export interface ChatSettings {
  defaultModel: string;
  systemPrompt: string;
  temperature: number;
}

interface SettingsModalProps {
  isOpen: boolean;
  settings: ChatSettings;
  isSaving: boolean;
  onClose: () => void;
  onSave: (settings: ChatSettings) => void;
  onClearChats: () => void;
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
}: SettingsModalProps): React.ReactElement | null {
  const [draft, setDraft] = useState<ChatSettings>(settings);

  useEffect(() => {
    if (isOpen) setDraft(settings);
  }, [isOpen, settings]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#111] p-5 text-white shadow-2xl">
        <BorderBeam
          size={110}
          duration={10}
          borderWidth={1.5}
          colorFrom="#a78bfa"
          colorTo="#22d3ee"
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Settings</h2>
            <p className="mt-1 text-sm text-zinc-400">Atur model, system prompt, dan temperature.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-200">Model</span>
            <select
              value={draft.defaultModel}
              onChange={(event) => setDraft((prev) => ({ ...prev, defaultModel: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-violet-400"
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-200">System prompt</span>
            <textarea
              value={draft.systemPrompt}
              onChange={(event) => setDraft((prev) => ({ ...prev, systemPrompt: event.target.value }))}
              rows={5}
              className="w-full resize-y rounded-lg border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
          </label>

          <label className="block space-y-2">
            <span className="flex items-center justify-between text-sm font-medium text-zinc-200">
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
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onClearChats}
            className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
          >
            Clear all chats
          </button>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onSave(draft)}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
