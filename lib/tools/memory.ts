import "server-only";
import { SchemaType } from "@google/generative-ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ToolDefinition } from "./types";

const MemoryArgsSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Kunci memori tidak boleh kosong")
    .max(100, "Kunci memori terlalu panjang"),
  value: z
    .string()
    .trim()
    .min(1, "Isi memori tidak boleh kosong")
    .max(1000, "Isi memori terlalu panjang"),
});

/**
 * `save_memory` — lets the assistant persist a durable fact about the user
 * (preferences, name, long-term context) so it is recalled in later chats.
 * Marked `sensitive` because it writes to the user's profile.
 */
export const memoryTool: ToolDefinition = {
  name: "save_memory",
  description:
    "Persist one durable fact about the user so it is remembered in future conversations.",
  settingKey: "memoryToolEnabled",
  sensitive: true,
  schema: MemoryArgsSchema,
  declaration: {
    name: "save_memory",
    description:
      "Save ONE durable, long-lived fact about the user (e.g. a stable preference, their name, or ongoing project context) so it is remembered across future conversations. Only use this for information clearly worth remembering long-term — never for one-off or trivial details.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        key: {
          type: SchemaType.STRING,
          description:
            "Short snake_case label for the fact, e.g. 'preferred_language' or 'company_name'.",
        },
        value: {
          type: SchemaType.STRING,
          description: "The concise fact to remember.",
        },
      },
      required: ["key", "value"],
    },
  },
  async execute(rawArgs, ctx) {
    const args = MemoryArgsSchema.parse(rawArgs);

    const existing = await prisma.memory.findFirst({
      where: {
        userId: ctx.userId,
        key: { equals: args.key, mode: "insensitive" },
      },
    });

    if (existing) {
      await prisma.memory.update({
        where: { id: existing.id },
        data: { value: args.value, enabled: true },
      });
    } else {
      await prisma.memory.create({
        data: {
          userId: ctx.userId,
          key: args.key,
          value: args.value,
          enabled: true,
        },
      });
    }

    return {
      response: {
        saved: true,
        key: args.key,
        note: "Memory saved. Acknowledge briefly to the user.",
      },
    };
  },
};
