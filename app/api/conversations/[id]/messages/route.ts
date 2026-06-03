import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  assertConversationOwner,
  getChatUser,
  serializeMessage,
} from "@/lib/chat-db";
import { authErrorResponse, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const session = await requireUser();
    const user = await getChatUser(session.userId);
    await assertConversationOwner(id, user.id);

    // Limit to last 100 messages to prevent excessive data transfer
    // on long conversations. Older messages can be loaded with pagination.
    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    messages.reverse();

    return NextResponse.json({ messages: messages.map(serializeMessage) });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "AUTH_REQUIRED") return authErrorResponse("Login diperlukan untuk membuka chat.");

    return NextResponse.json(
      { error: message === "CONVERSATION_NOT_FOUND" ? "Conversation not found" : message },
      { status: message === "CONVERSATION_NOT_FOUND" ? 404 : 500 }
    );
  }
}
