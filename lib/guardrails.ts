import "server-only";
import { ALL_TOOLS, getToolByName } from "@/lib/tools";

/**
 * Shape of the tool/guardrail toggles read from `Setting` (per-user) and
 * `AppSetting` (global). All optional so callers can pass partial rows.
 */
export interface ToolToggleSource {
  toolsEnabled?: boolean | null;
  imageToolEnabled?: boolean | null;
  knowledgeToolEnabled?: boolean | null;
  memoryToolEnabled?: boolean | null;
  guardrailsEnabled?: boolean | null;
  blockedKeywords?: string | null;
}

/**
 * A small built-in safety net applied on top of user/admin keywords whenever
 * guardrails are enabled. Kept conservative on purpose — the main control is
 * the configurable `blockedKeywords` list.
 */
const DEFAULT_BLOCKED_KEYWORDS: string[] = [];

export interface InputGuardResult {
  allowed: boolean;
  reason?: string;
}

/** Merge comma-separated keyword strings from several sources into one list. */
export function parseBlockedKeywords(
  ...sources: Array<string | null | undefined>
): string[] {
  const set = new Set<string>(DEFAULT_BLOCKED_KEYWORDS);
  for (const source of sources) {
    if (!source) continue;
    for (const part of source.split(",")) {
      const term = part.trim().toLowerCase();
      if (term) set.add(term);
    }
  }
  return Array.from(set);
}

/**
 * Input guardrail: blocks a user message if it contains a configured keyword.
 * No-op when guardrails are disabled. Length limits are handled in the route.
 */
export function checkUserInput(
  message: string,
  opts: { guardrailsEnabled: boolean; blockedKeywords: string[] }
): InputGuardResult {
  if (!opts.guardrailsEnabled) return { allowed: true };

  const lower = message.toLowerCase();
  const hit = opts.blockedKeywords.find(
    (kw) => kw.length > 0 && lower.includes(kw)
  );
  if (hit) {
    return {
      allowed: false,
      reason:
        "Pesan mengandung kata/konten yang diblokir oleh kebijakan guardrails.",
    };
  }
  return { allowed: true };
}

/**
 * Resolve which tools may be used, combining global (admin) and per-user
 * toggles. Global acts as a hard cap: a tool is enabled only if BOTH the
 * global and the user toggle allow it. Missing values default to enabled.
 */
export function resolveEnabledTools(
  global: ToolToggleSource | null,
  user: ToolToggleSource | null
): Set<string> {
  const enabled = new Set<string>();

  const masterGlobal = global?.toolsEnabled ?? true;
  const masterUser = user?.toolsEnabled ?? true;
  if (!masterGlobal || !masterUser) return enabled; // master switch off

  for (const tool of ALL_TOOLS) {
    const key = tool.settingKey;
    const allowedGlobally = global?.[key] ?? true;
    const allowedForUser = user?.[key] ?? true;
    if (allowedGlobally && allowedForUser) {
      enabled.add(tool.name);
    }
  }
  return enabled;
}

export interface ToolCallGuardResult {
  allowed: boolean;
  reason?: string;
  /** Validated + parsed args, present only when `allowed` is true. */
  args?: unknown;
}

/**
 * Per-call guardrail run for every function the model wants to invoke:
 *  1. tool must exist,
 *  2. tool must be enabled by settings,
 *  3. arguments must pass the tool's zod schema.
 */
export function guardToolCall(
  name: string,
  rawArgs: unknown,
  opts: { enabledTools: Set<string> }
): ToolCallGuardResult {
  const tool = getToolByName(name);
  if (!tool) {
    return { allowed: false, reason: `Tool tidak dikenal: ${name}` };
  }
  if (!opts.enabledTools.has(name)) {
    return {
      allowed: false,
      reason: `Tool "${name}" sedang dinonaktifkan oleh pengaturan.`,
    };
  }

  const parsed = tool.schema.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    const message =
      parsed.error.issues?.[0]?.message ?? "Argumen tidak valid.";
    return {
      allowed: false,
      reason: `Argumen untuk "${name}" tidak valid: ${message}`,
    };
  }

  return { allowed: true, args: parsed.data };
}
