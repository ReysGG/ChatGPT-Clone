import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireUser } from "@/lib/auth";
import {
  assertConversationOwner,
  createShareId,
  getChatUser,
  serializeConversation,
} from "@/lib/chat-db";
import { prisma } from "@/lib/prisma";
import { logActivityEvent } from "@/lib/activity";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ShareSchema = z.object({
  isShared: z.boolean(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    const body = ShareSchema.parse(await request.json());

    const globalSettings = await prisma.appSetting.findFirst();
    if (body.isShared && globalSettings && !globalSettings.sharingEnabled) {
      return NextResponse.json(
        { error: "Fitur berbagi percakapan sedang dinonaktifkan oleh administrator." },
        { status: 403 }
      );
    }

    const user = await getChatUser(session.userId);
    const conversation = await assertConversationOwner(id, user.id);

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: body.isShared
        ? {
            isShared: true,
            shareId: conversation.shareId ?? createShareId(),
            sharedAt: new Date(),
          }
        : {
            isShared: false,
            shareId: null,
            sharedAt: null,
          },
    });

    void logActivityEvent(
      session.userId ?? null,
      body.isShared ? "share_enabled" : "share_disabled",
      {
        conversationId: conversation.id,
        conversationTitle: conversation.title,
        shareId: updated.shareId,
      }
    );

    return NextResponse.json({ conversation: serializeConversation(updated) });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Invalid share request"
      : (error as Error).message;

    if (message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk share chat.");
    }

    return NextResponse.json(
      { error: message === "CONVERSATION_NOT_FOUND" ? "Conversation not found" : message },
      { status: error instanceof z.ZodError ? 400 : message === "CONVERSATION_NOT_FOUND" ? 404 : 500 }
    );
  }
}
