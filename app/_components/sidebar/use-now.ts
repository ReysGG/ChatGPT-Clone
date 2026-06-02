"use client";

import { useEffect, useState } from "react";

/**
 * Hydration-safe wall clock.
 *
 * Returns `null` on the server and the first client render (matching
 * the server output) so React doesn't throw a hydration mismatch.
 * After mount, it returns a real `Date.now()` value that refreshes
 * every `intervalMs` ms.
 */
export function useNow(intervalMs: number = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}

/** Compact relative-time formatter: "now" / "5m" / "3h" / "2d". */
export function formatRelative(iso: string, nowMs: number): string {
  const diffMs = nowMs - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
