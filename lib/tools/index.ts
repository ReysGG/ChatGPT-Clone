import "server-only";
import type { FunctionDeclaration } from "@google/generative-ai";
import { imageTool } from "./image";
import { knowledgeTool } from "./knowledge";
import { memoryTool } from "./memory";
import type { ToolDefinition } from "./types";

/** Every tool the assistant can potentially call. */
export const ALL_TOOLS: ToolDefinition[] = [
  imageTool,
  knowledgeTool,
  memoryTool,
];

const TOOLS_BY_NAME: Record<string, ToolDefinition> = Object.fromEntries(
  ALL_TOOLS.map((tool) => [tool.name, tool])
);

export function getToolByName(name: string): ToolDefinition | undefined {
  return TOOLS_BY_NAME[name];
}

/**
 * Build the Gemini `functionDeclarations` list from the set of enabled tool
 * names (resolved by guardrails from admin + user settings).
 */
export function buildFunctionDeclarations(
  enabledToolNames: Set<string>
): FunctionDeclaration[] {
  return ALL_TOOLS.filter((tool) => enabledToolNames.has(tool.name)).map(
    (tool) => tool.declaration
  );
}

export type { ToolDefinition, ToolContext, ToolResult } from "./types";
