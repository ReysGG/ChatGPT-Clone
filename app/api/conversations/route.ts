import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getChatUser,
  serializeConversation,
} from "@/lib/chat-db";
import { authErrorResponse, getSession, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json({ conversations: [] });
    }

    const user = await getChatUser(session.userId);
    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      conversations: conversations.map(serializeConversation),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load conversations" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await requireUser();
    const user = await getChatUser(session.userId);
    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: "Percakapan baru",
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json(
      { conversation: serializeConversation(conversation) },
      { status: 201 }
    );
  } catch (error) {
    const message = (error as Error).message;
    if (message === "AUTH_REQUIRED") return authErrorResponse("Login diperlukan untuk membuat chat baru.");

    return NextResponse.json(
      { error: message || "Failed to create conversation" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await requireUser();
    const user = await getChatUser(session.userId);
    await prisma.conversation.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "AUTH_REQUIRED") return authErrorResponse("Login diperlukan untuk menghapus chat.");

    return NextResponse.json(
      { error: message || "Failed to clear conversations" },
      { status: 500 }
    );
  }
}
