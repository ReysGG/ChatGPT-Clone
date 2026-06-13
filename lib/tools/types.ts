import "server-only";
import type { FunctionDeclaration } from "@google/generative-ai";
import type { ZodTypeAny } from "zod";

/**
 * Runtime context passed to every tool's `execute`.
 * `emit` lets a tool push live SSE events (e.g. image-generation progress)
 * to the client during the agentic loop.
 */
export interface ToolContext {
  userId: string;
  conversationId: string;
  emit?: (event: string, data: unknown) => void;
  signal?: AbortSignal;
}

export interface ToolResult {
  /**
   * Structured payload returned to the model as the `functionResponse`.
   * Keep it small and JSON-serializable.
   */
  response: Record<string, unknown>;
  /**
   * Optional markdown appended to the final assistant message and streamed
   * to the client (e.g. the generated image). The model is told NOT to
   * reproduce this itself.
   */
  artifactMarkdown?: string;
}

/** The Setting/AppSetting boolean column that toggles a tool on/off. */
export type ToolSettingKey =
  | "imageToolEnabled"
  | "knowledgeToolEnabled"
  | "memoryToolEnabled";

/**
 * A tool the model can call. Intentionally NON-generic: `execute` receives
 * `unknown` args and re-validates them with its own zod `schema`. This avoids
 * TypeScript function-parameter variance issues when storing many tools with
 * different arg shapes in a single registry array.
 */
export interface ToolDefinition {
  /** Must match `declaration.name`. */
  name: string;
  /** Human-readable description (for logs / settings UI). */
  description: string;
  /** Gemini function declaration sent to the model. */
  declaration: FunctionDeclaration;
  /** Zod schema used by guardrails to validate the model-provided args. */
  schema: ZodTypeAny;
  /** Which settings column enables this tool. */
  settingKey: ToolSettingKey;
  /** Sensitive tools have write side-effects (used for stricter guarding). */
  sensitive?: boolean;
  execute: (args: unknown, ctx: ToolContext) => Promise<ToolResult>;
}
