import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getChatUser,
  serializeConversation,
} from "@/lib/chat-db";
import { authErrorResponse, getSession, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const CONVERSATIONS_PER_PAGE = 50;

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json({ conversations: [], nextCursor: null });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");

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
      take: CONVERSATIONS_PER_PAGE + 1, // fetch one extra to determine if there's a next page
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = conversations.length > CONVERSATIONS_PER_PAGE;
    const page = hasMore ? conversations.slice(0, CONVERSATIONS_PER_PAGE) : conversations;
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

    return NextResponse.json({
      conversations: page.map(serializeConversation),
      nextCursor,
    });
  } catch (error) {
    console.error("[GET /api/conversations]", error);
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

    console.error("[POST /api/conversations]", error);
    return NextResponse.json(
      { error: "Gagal membuat chat baru. Coba lagi." },
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

    console.error("[DELETE /api/conversations]", error);
    return NextResponse.json(
      { error: "Gagal menghapus chat. Coba lagi." },
      { status: 500 }
    );
  }
}
