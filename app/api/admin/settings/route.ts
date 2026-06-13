import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

const AdminSettingsSchema = z.object({
  defaultModel: z.string().trim().min(1),
  systemPrompt: z.string().trim().min(1),
  temperature: z.coerce.number().min(0).max(2),
  registrationEnabled: z.boolean(),
  sharingEnabled: z.boolean(),
  maxMessagesPerChat: z.coerce.number().int().min(1),
  maxPromptLength: z.coerce.number().int().min(1),
  maxMessagesPerUserPerDay: z.coerce.number().int().min(1),
  rateLimitMessagesPerMinute: z.coerce.number().int().min(1),
  // Agentic tools & guardrails (global master switches). Optional so the
  // existing admin form keeps working until the UI is updated.
  toolsEnabled: z.boolean().optional(),
  imageToolEnabled: z.boolean().optional(),
  knowledgeToolEnabled: z.boolean().optional(),
  memoryToolEnabled: z.boolean().optional(),
  guardrailsEnabled: z.boolean().optional(),
  blockedKeywords: z.string().trim().max(2000).nullish().transform((v) => (v === undefined ? undefined : v || null)),
  maxToolCallsPerMessage: z.coerce.number().int().min(0).max(20).optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    let settings = await prisma.appSetting.findFirst();
    if (!settings) {
      settings = await prisma.appSetting.create({
        data: {
          id: "global",
          defaultModel: "gemini-2.5-flash-lite",
          defaultSystemPrompt: "You are a helpful personal AI assistant.",
          defaultTemperature: 0.7,
          registrationEnabled: true,
          sharingEnabled: true,
          maxMessagesPerChat: 100,
          maxPromptLength: 4000,
          maxMessagesPerUserPerDay: 50,
          rateLimitMessagesPerMinute: 10,
        },
      });
    }
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_REQUIRED") {
      return authErrorResponse("Akses ditolak. Anda bukan admin.", 403);
    }
    return NextResponse.json(
      { error: "Gagal memuat setelan admin." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    const body = AdminSettingsSchema.parse(await request.json());
    
    let settings = await prisma.appSetting.findFirst();
    if (settings) {
      settings = await prisma.appSetting.update({
        where: { id: settings.id },
        data: {
          defaultModel: body.defaultModel,
          defaultSystemPrompt: body.systemPrompt,
          defaultTemperature: body.temperature,
          registrationEnabled: body.registrationEnabled,
          sharingEnabled: body.sharingEnabled,
          maxMessagesPerChat: body.maxMessagesPerChat,
          maxPromptLength: body.maxPromptLength,
          maxMessagesPerUserPerDay: body.maxMessagesPerUserPerDay,
          rateLimitMessagesPerMinute: body.rateLimitMessagesPerMinute,
          toolsEnabled: body.toolsEnabled,
          imageToolEnabled: body.imageToolEnabled,
          knowledgeToolEnabled: body.knowledgeToolEnabled,
          memoryToolEnabled: body.memoryToolEnabled,
          guardrailsEnabled: body.guardrailsEnabled,
          blockedKeywords: body.blockedKeywords,
          maxToolCallsPerMessage: body.maxToolCallsPerMessage,
        },
      });
    } else {
      settings = await prisma.appSetting.create({
        data: {
          id: "global",
          defaultModel: body.defaultModel,
          defaultSystemPrompt: body.systemPrompt,
          defaultTemperature: body.temperature,
          registrationEnabled: body.registrationEnabled,
          sharingEnabled: body.sharingEnabled,
          maxMessagesPerChat: body.maxMessagesPerChat,
          maxPromptLength: body.maxPromptLength,
          maxMessagesPerUserPerDay: body.maxMessagesPerUserPerDay,
          rateLimitMessagesPerMinute: body.rateLimitMessagesPerMinute,
          toolsEnabled: body.toolsEnabled,
          imageToolEnabled: body.imageToolEnabled,
          knowledgeToolEnabled: body.knowledgeToolEnabled,
          memoryToolEnabled: body.memoryToolEnabled,
          guardrailsEnabled: body.guardrailsEnabled,
          blockedKeywords: body.blockedKeywords,
          maxToolCallsPerMessage: body.maxToolCallsPerMessage,
        },
      });
    }
    
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_REQUIRED") {
      return authErrorResponse("Akses ditolak. Anda bukan admin.", 403);
    }
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Format setelan tidak valid."
      : "Gagal menyimpan setelan admin.";
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
