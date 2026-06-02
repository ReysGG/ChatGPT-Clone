/**
 * Time formatters used across the chat UI.
 * Both are deterministic; the time formatters can be hydrated safely because
 * the consumer falls back to a placeholder when the value is missing.
 */

export function formatClockTime(d: Date = new Date()): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
