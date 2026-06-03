import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_MODEL } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getChatUser } from "@/lib/chat-db";
import { authErrorResponse, getSession, requireUser } from "@/lib/auth";
import { logActivityEvent } from "@/lib/activity";

export const dynamic = "force-dynamic";

const SettingsSchema = z.object({
  defaultModel: z.string().trim().min(1).max(80),
  systemPrompt: z.string().trim().max(4000).nullish().transform((v) => v || null),
  temperature: z.coerce.number().min(0).max(2),
});

function serializeSettings(settings: {
  defaultModel: string | null;
  systemPrompt: string | null;
  temperature: number;
}) {
  return {
    defaultModel: settings.defaultModel || DEFAULT_MODEL,
    // Return null/empty so the chat API can fall through to the global admin system prompt.
    // Only return the personal prompt if the user has explicitly set one.
    systemPrompt: settings.systemPrompt?.trim() || null,
    temperature: settings.temperature,
  };
}

export async function GET() {
  try {
    const globalSettings = await prisma.appSetting.findFirst();
    const defaultModelVal = globalSettings?.defaultModel || DEFAULT_MODEL;
    const defaultPromptVal = globalSettings?.defaultSystemPrompt || "You are a helpful personal AI assistant.";
    const defaultTempVal = globalSettings?.defaultTemperature ?? 0.7;

    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json({
        settings: serializeSettings({
          defaultModel: defaultModelVal,
          systemPrompt: defaultPromptVal,
          temperature: defaultTempVal,
        }),
      });
    }

    const user = await getChatUser(session.userId);
    const settings = await prisma.setting.findFirst({ where: { userId: user.id } });

    if (settings) {
      return NextResponse.json({ settings: serializeSettings(settings) });
    }

    const created = await prisma.setting.create({
      data: {
        userId: user.id,
        defaultModel: defaultModelVal,
        systemPrompt: defaultPromptVal,
        temperature: defaultTempVal,
        darkMode: true,
      },
    });

    return NextResponse.json({ settings: serializeSettings(created) });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireUser();
    const body = SettingsSchema.parse(await request.json());
    const user = await getChatUser(session.userId);
    const existing = await prisma.setting.findFirst({ where: { userId: user.id } });

    const settings = existing
      ? await prisma.setting.update({
          where: { id: existing.id },
          data: body,
        })
      : await prisma.setting.create({
          data: {
            userId: user.id,
            ...body,
            darkMode: true,
          },
        });

    void logActivityEvent(session.userId ?? null, "settings_saved", {
      defaultModel: body.defaultModel,
      temperature: body.temperature,
      systemPromptLength: body.systemPrompt?.length ?? 0,
    });

    return NextResponse.json({ settings: serializeSettings(settings) });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Invalid settings"
      : (error as Error).message;

    if (message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk mengubah settings.");
    }

    return NextResponse.json(
      { error: message },
      { status: error instanceof z.ZodError ? 400 : 500 }
    );
  }
}
