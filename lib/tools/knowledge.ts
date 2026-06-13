import "server-only";
import { SchemaType } from "@google/generative-ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ToolDefinition } from "./types";

const KnowledgeArgsSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, "Query terlalu pendek")
    .max(300, "Query terlalu panjang"),
  limit: z.number().int().min(1).max(10).optional(),
});

/**
 * `search_knowledge` — lightweight retrieval over the user's KnowledgeEntry
 * table. Uses case-insensitive keyword matching + naive term-frequency
 * scoring (no embeddings required). Returns the top matches as context.
 */
export const knowledgeTool: ToolDefinition = {
  name: "search_knowledge",
  description:
    "Search the curated knowledge base (admin-installed global entries + the user's own) for saved facts, notes or documents.",
  settingKey: "knowledgeToolEnabled",
  sensitive: false,
  schema: KnowledgeArgsSchema,
  declaration: {
    name: "search_knowledge",
    description:
      "Search the knowledge base for facts, policies, product info, notes, or documents. It contains admin-curated information for this assistant (and any of the user's own saved entries). Call this BEFORE answering questions that may rely on this app's specific/internal knowledge, or when unsure.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "Keywords or a short natural-language query to look up.",
        },
        limit: {
          type: SchemaType.INTEGER,
          description: "Maximum number of entries to return (1-10). Default 5.",
        },
      },
      required: ["query"],
    },
  },
  async execute(rawArgs, ctx) {
    const args = KnowledgeArgsSchema.parse(rawArgs);
    const limit = args.limit ?? 5;

    const terms = Array.from(
      new Set(
        args.query
          .toLowerCase()
          .split(/\s+/)
          .map((t) => t.trim())
          .filter((t) => t.length >= 2)
      )
    ).slice(0, 8);

    const entries = await prisma.knowledgeEntry.findMany({
      where: {
        enabled: true,
        // Global (admin-installed) knowledge applies to everyone; users may
        // also have their own personal entries.
        OR: [{ isGlobal: true }, { userId: ctx.userId }],
        ...(terms.length
          ? {
              AND: [
                {
                  OR: terms.flatMap((t) => [
                    { title: { contains: t, mode: "insensitive" as const } },
                    { content: { contains: t, mode: "insensitive" as const } },
                    { tags: { contains: t, mode: "insensitive" as const } },
                  ]),
                },
              ],
            }
          : {}),
      },
      take: 25,
      orderBy: { updatedAt: "desc" },
    });

    // Naive term-frequency scoring to surface the most relevant entries.
    const scored = entries
      .map((entry) => {
        const haystack =
          `${entry.title}\n${entry.content}\n${entry.tags ?? ""}`.toLowerCase();
        const score = terms.reduce(
          (acc, t) => acc + (haystack.split(t).length - 1),
          0
        );
        return { entry, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return {
      response: {
        count: scored.length,
        results: scored.map(({ entry }) => ({
          title: entry.title,
          content:
            entry.content.length > 1200
              ? `${entry.content.slice(0, 1200)}…`
              : entry.content,
          tags: entry.tags ?? undefined,
        })),
        note:
          scored.length === 0
            ? "No matching knowledge entries found. Answer from your own general knowledge and say you found nothing saved."
            : undefined,
      },
    };
  },
};
