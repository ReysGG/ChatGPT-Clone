"use client";

import { useState } from "react";
import { BorderBeam } from "@/components/ui/border-beam";
import { getModelLabel, type ChatSettings } from "@/app/_components/settings-modal";

const MODEL_OPTIONS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
];

export function AdminSettingsForm({ initialSettings }: { initialSettings: ChatSettings }): React.ReactElement {
  const [settings, setSettings] = useState<ChatSettings>(initialSettings);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Request failed: ${response.status}`);
      }

      setSettings(data.settings as ChatSettings);
      setStatus("Settings tersimpan.");
    } catch (error) {
      setStatus((error as Error).message || "Gagal menyimpan settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative mt-4 overflow-hidden rounded-md border border-neutral-200 bg-white p-4 shadow-none"
    >
      <BorderBeam
        size={120}
        duration={12}
        borderWidth={1.5}
        colorFrom="#4f46e5"
        colorTo="#f59e0b"
      />
      <div className="relative space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Default model</span>
          <select
            value={settings.defaultModel}
            onChange={(event) => setSettings((prev) => ({ ...prev, defaultModel: event.target.value }))}
            className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            {MODEL_OPTIONS.map((model) => (
              <option key={model} value={model}>
                {getModelLabel(model) || model}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-neutral-700">Temperature</span>
          <input
            type="number"
            min="0"
            max="2"
            step="0.1"
            value={settings.temperature}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, temperature: Number(event.target.value) }))
            }
            className="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-neutral-700">System prompt</span>
        <textarea
          value={settings.systemPrompt}
          onChange={(event) => setSettings((prev) => ({ ...prev, systemPrompt: event.target.value }))}
          rows={6}
          className="mt-1 w-full resize-y rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {isSaving ? "Menyimpan..." : "Simpan settings"}
        </button>
        {status && <p className="text-sm text-neutral-600">{status}</p>}
        </div>
      </div>
    </form>
  );
}
