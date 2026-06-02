import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertConversationOwner,
  getOrCreateDefaultUser,
} from "@/lib/chat-db";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = await getOrCreateDefaultUser();
    await assertConversationOwner(id, user.id);

    await prisma.conversation.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = (error as Error).message;
    return NextResponse.json(
      { error: message === "CONVERSATION_NOT_FOUND" ? "Conversation not found" : message },
      { status: message === "CONVERSATION_NOT_FOUND" ? 404 : 500 }
    );
  }
}
