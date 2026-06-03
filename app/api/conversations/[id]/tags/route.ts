import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertConversationOwner, getChatUser, serializeConversation } from "@/lib/chat-db";
import { authErrorResponse, requireUser } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const session = await requireUser();
    const user = await getChatUser(session.userId);

    // Validate ownership
    await assertConversationOwner(conversationId, user.id);

    const body = await request.json().catch(() => ({}));
    const tagNames = body.tagNames as string[];

    if (!Array.isArray(tagNames)) {
      return NextResponse.json(
        { error: "tagNames must be an array of strings" },
        { status: 400 }
      );
    }

    // Upsert all tags first
    const tags = await Promise.all(
      tagNames
        .map((name) => (name || "").trim())
        .filter(Boolean)
        .map((name) =>
          prisma.tag.upsert({
            where: {
              userId_name: {
                userId: user.id,
                name,
              },
            },
            update: {},
            create: {
              userId: user.id,
              name,
            },
          })
        )
    );

    // Sync tags on conversation
    await prisma.$transaction([
      prisma.conversationTag.deleteMany({
        where: { conversationId },
      }),
      prisma.conversationTag.createMany({
        data: tags.map((tag) => ({
          conversationId,
          tagId: tag.id,
        })),
        skipDuplicates: true,
      }),
    ]);

    // Fetch conversation with tags to serialize back
    const updatedConversation = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json({
      conversation: serializeConversation(updatedConversation),
    });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "AUTH_REQUIRED") return authErrorResponse("Login diperlukan.");
    if (message === "CONVERSATION_NOT_FOUND") {
      return NextResponse.json({ error: "Conversation not found or access denied" }, { status: 404 });
    }

    return NextResponse.json(
      { error: message || "Failed to update tags" },
      { status: 500 }
    );
  }
}
