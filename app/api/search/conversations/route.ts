import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getChatUser, serializeConversation } from "@/lib/chat-db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session.isAuthenticated) {
      return NextResponse.json({ conversations: [] });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    if (!q.trim()) {
      return NextResponse.json({ conversations: [] });
    }

    const user = await getChatUser(session.userId);

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: user.id,
        OR: [
          {
            title: {
              contains: q,
              mode: "insensitive",
            },
          },
          {
            messages: {
              some: {
                content: {
                  contains: q,
                  mode: "insensitive",
                },
              },
            },
          },
        ],
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({
      conversations: conversations.map(serializeConversation),
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to search conversations" },
      { status: 500 }
    );
  }
}
