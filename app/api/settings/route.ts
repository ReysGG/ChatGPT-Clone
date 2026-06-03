import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_MODEL } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getChatUser } from "@/lib/chat-db";
import { authErrorResponse, getSession, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SettingsSchema = z.object({
  defaultModel: z.string().trim().min(1).max(80),
  systemPrompt: z.string().trim().min(1).max(4000),
  temperature: z.coerce.number().min(0).max(2),
});

function serializeSettings(settings: {
  defaultModel: string | null;
  systemPrompt: string | null;
  temperature: number;
}) {
  return {
    defaultModel: settings.defaultModel || DEFAULT_MODEL,
    systemPrompt: settings.systemPrompt || "You are a helpful personal AI assistant.",
    temperature: settings.temperature,
  };
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json({
        settings: serializeSettings({
          defaultModel: DEFAULT_MODEL,
          systemPrompt: "You are a helpful personal AI assistant.",
          temperature: 0.7,
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
        defaultModel: DEFAULT_MODEL,
        systemPrompt: "You are a helpful personal AI assistant.",
        temperature: 0.7,
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
