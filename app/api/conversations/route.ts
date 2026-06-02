import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getOrCreateDefaultUser,
  serializeConversation,
} from "@/lib/chat-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getOrCreateDefaultUser();
    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
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
    const user = await getOrCreateDefaultUser();
    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: "Percakapan baru",
      },
    });

    return NextResponse.json(
      { conversation: serializeConversation(conversation) },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to create conversation" },
      { status: 500 }
    );
  }
}
