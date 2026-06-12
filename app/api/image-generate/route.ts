import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireUser } from "@/lib/auth";
import {
  assertConversationOwner,
  createTitleFromMessage,
  getChatUser,
  serializeConversation,
  serializeMessage,
} from "@/lib/chat-db";
import {
  generateImageViaFlow,
  type ImageGenProgress,
} from "@/lib/image-generator";

export const dynamic = "force-dynamic";

// Increase timeout for image generation (can take 2+ minutes)
export const maxDuration = 180;

const encoder = new TextEncoder();

function encodeEvent(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser();
    const body = await request.json();
    const { prompt, conversationId } = body as {
      prompt: string;
      conversationId?: string | null;
    };

    if (!prompt || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Prompt gambar tidak boleh kosong." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const user = await getChatUser(session.userId);

    // Get or create conversation
    let conversation = conversationId
      ? await assertConversationOwner(conversationId, user.id)
      : await prisma.conversation.create({
          data: {
            userId: user.id,
            title: createTitleFromMessage(`🎨 ${prompt}`),
          },
        });

    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: prompt,
      },
    });

    // Update conversation title if it's the first message
    const existingMessageCount = await prisma.message.count({
      where: { conversationId: conversation.id },
    });
    if (existingMessageCount <= 1) {
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: { title: createTitleFromMessage(`🎨 ${prompt}`) },
      });
    }

    // Stream progress events using SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send meta event first
          controller.enqueue(
            encodeEvent("meta", {
              conversation: serializeConversation(conversation),
              userMessage: serializeMessage(userMessage),
            })
          );

          // Generate image with progress callback
          const result = await generateImageViaFlow(
            prompt,
            (progress: ImageGenProgress) => {
              if (request.signal.aborted) return;

              controller.enqueue(
                encodeEvent("progress", {
                  stage: progress.stage,
                  message: progress.message,
                })
              );
            }
          );

          // Save assistant message with image markdown
          const imageMarkdown = `![Generated Image](${result.imagePath})\n\n*Gambar digenerate menggunakan Google Flow berdasarkan prompt: "${prompt}"*`;

          const assistantMessage = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: "assistant",
              content: imageMarkdown,
            },
          });

          const updatedConversation = await prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          });

          // Log usage event
          try {
            await prisma.usageEvent.create({
              data: {
                userId: user.id,
                conversationId: conversation.id,
                type: "image_generation",
                provider: "google_flow",
                model: "flow",
              },
            });
          } catch (err) {
            console.error("Failed to log usage event:", err);
          }

          controller.enqueue(
            encodeEvent("done", {
              conversation: serializeConversation(updatedConversation),
              assistantMessage: serializeMessage(assistantMessage),
              imagePath: result.imagePath,
            })
          );
        } catch (error) {
          console.error("Image generation error:", error);

          // Save error as assistant message
          const errorText =
            (error as Error).message || "Gagal generate gambar.";

          const errorMessage = await prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: "assistant",
              content: `⚠️ Gagal membuat gambar: ${errorText}`,
            },
          });

          controller.enqueue(
            encodeEvent("error", {
              error: errorText,
              assistantMessage: serializeMessage(errorMessage),
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
  } catch (error) {
    const message = (error as Error).message;

    if (message === "AUTH_REQUIRED") {
      return authErrorResponse();
    }

    return new Response(
      JSON.stringify({
        error:
          message === "CONVERSATION_NOT_FOUND"
            ? "Conversation not found"
            : `Gagal generate gambar: ${message}`,
      }),
      {
        status:
          message === "CONVERSATION_NOT_FOUND" ? 404 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
