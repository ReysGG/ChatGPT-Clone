import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertConversationOwner,
  getChatUser,
  serializeConversation,
} from "@/lib/chat-db";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { z } from "zod";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    const body = z.object({ title: z.string().trim().min(1, "Title cannot be empty") }).parse(await request.json());
    const user = await getChatUser(session.userId);
    const conversation = await assertConversationOwner(id, user.id);

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { title: body.title },
    });

    return NextResponse.json({ conversation: serializeConversation(updated) });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Invalid request body"
      : (error as Error).message;

    if (message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk mengubah nama chat.");
    }

    return NextResponse.json(
      { error: message === "CONVERSATION_NOT_FOUND" ? "Conversation not found" : message },
      { status: error instanceof z.ZodError ? 400 : message === "CONVERSATION_NOT_FOUND" ? 404 : 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    const user = await getChatUser(session.userId);
    await assertConversationOwner(id, user.id);

    await prisma.conversation.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "AUTH_REQUIRED") return authErrorResponse("Login diperlukan untuk menghapus chat.");
    return NextResponse.json(
      { error: message === "CONVERSATION_NOT_FOUND" ? "Conversation not found" : message },
      { status: message === "CONVERSATION_NOT_FOUND" ? 404 : 500 }
    );
  }
}

