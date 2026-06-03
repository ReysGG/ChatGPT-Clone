import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_MODEL, getModel } from "@/lib/ai";
import { getFriendlyChatError } from "@/lib/chat-errors";
import { authErrorResponse, requireUser } from "@/lib/auth";
import {
  assertConversationOwner,
  createTitleFromMessage,
  getChatUser,
  serializeConversation,
  serializeMessage,
} from "@/lib/chat-db";

export const dynamic = "force-dynamic";

const ChatRequestSchema = z.object({
  conversationId: z.string().optional().nullable(),
  message: z.string().trim().min(1, "Message is required"),
  model: z.string().trim().optional(),
  systemPrompt: z.string().trim().optional(),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean().optional().default(false),
});

const encoder = new TextEncoder();

function encodeEvent(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser();
    const body = ChatRequestSchema.parse(await request.json());
    const user = await getChatUser(session.userId);

    let conversation = body.conversationId
      ? await assertConversationOwner(body.conversationId, user.id)
      : await prisma.conversation.create({
          data: {
            userId: user.id,
            title: createTitleFromMessage(body.message),
          },
        });

    const existingMessageCount = await prisma.message.count({
      where: { conversationId: conversation.id },
    });

    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: body.message,
      },
    });

    if (existingMessageCount === 0) {
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: { title: createTitleFromMessage(body.message) },
      });
    }

    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 24,
    });

    const settings = await prisma.setting.findFirst({ where: { userId: user.id } });
    const systemPrompt = body.systemPrompt || settings?.systemPrompt || "You are a helpful personal AI assistant.";
    const prompt = [
      `System: ${systemPrompt}`,
      ...history.map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`),
    ].join("\n\n");

    const modelName = body.model || settings?.defaultModel || DEFAULT_MODEL;
    const temperature = body.temperature ?? settings?.temperature ?? 0.7;
    const model = getModel(modelName);
    const generationConfig = { temperature };

    if (body.stream) {
      const stream = new ReadableStream({
        async start(controller) {
          let assistantText = "";

          try {
            controller.enqueue(
              encodeEvent("meta", {
                conversation: serializeConversation(conversation),
                userMessage: serializeMessage(userMessage),
              })
            );

            const result = await model.generateContentStream({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig,
            });

            for await (const chunk of result.stream) {
              if (request.signal.aborted) break;

              const text = chunk.text();
              if (!text) continue;

              assistantText += text;
              controller.enqueue(encodeEvent("delta", { text }));
            }

            const finalText = assistantText.trim() || "Maaf, saya belum bisa membuat jawaban.";
            const assistantMessage = await prisma.message.create({
              data: {
                conversationId: conversation.id,
                role: "assistant",
                content: finalText,
              },
            });

            const updatedConversation = await prisma.conversation.update({
              where: { id: conversation.id },
              data: { updatedAt: new Date() },
            });

            controller.enqueue(
              encodeEvent("done", {
                conversation: serializeConversation(updatedConversation),
                assistantMessage: serializeMessage(assistantMessage),
              })
            );
          } catch (error) {
            controller.enqueue(
              encodeEvent("error", {
                error: getFriendlyChatError(error),
              })
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });
    const assistantText = result.response.text().trim() || "Maaf, saya belum bisa membuat jawaban.";

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: assistantText,
      },
    });

    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({
      conversation: serializeConversation(conversation),
      userMessage: serializeMessage(userMessage),
      assistantMessage: serializeMessage(assistantMessage),
    });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Invalid request"
      : (error as Error).message;

    if (message === "AUTH_REQUIRED") {
      return authErrorResponse();
    }

    return NextResponse.json(
      {
        error: message === "CONVERSATION_NOT_FOUND"
          ? "Conversation not found"
          : getFriendlyChatError(error),
      },
      {
        status: error instanceof z.ZodError ? 400 : message === "CONVERSATION_NOT_FOUND" ? 404 : 500,
      }
    );
  }
}
