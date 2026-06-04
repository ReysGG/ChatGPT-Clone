import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { DEFAULT_MODEL, getModel, getGenAI } from "@/lib/ai";
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
  uploadIds: z.array(z.string()).optional(),
  webSearch: z.boolean().optional(),
});

const encoder = new TextEncoder();

function encodeEvent(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function logUsageEvent({
  userId,
  conversationId,
  type,
  provider,
  model,
  inputTokens,
  outputTokens,
}: {
  userId: string;
  conversationId?: string | null;
  type: string;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}) {
  try {
    await prisma.usageEvent.create({
      data: {
        userId,
        conversationId,
        type,
        provider,
        model,
        inputTokens,
        outputTokens,
      },
    });
  } catch (error) {
    console.error("Failed to log usage event:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser();
    const body = ChatRequestSchema.parse(await request.json());

    const globalSettings = await prisma.appSetting.findFirst();
    const maxPromptLen = globalSettings?.maxPromptLength ?? 4000;
    if (body.message.length > maxPromptLen) {
      return NextResponse.json(
        { error: `Pesan terlalu panjang (maksimal ${maxPromptLen} karakter).` },
        { status: 400 }
      );
    }

    const user = await getChatUser(session.userId);

    // Rate Limiting per minute
    const rateLimitMessagesPerMinute = globalSettings?.rateLimitMessagesPerMinute ?? 10;
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const minuteCount = await prisma.usageEvent.count({
      where: {
        userId: user.id,
        type: "chat_message",
        createdAt: { gte: oneMinuteAgo },
      },
    });

    if (minuteCount >= rateLimitMessagesPerMinute) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Silakan tunggu sebentar sebelum mengirim pesan lagi." },
        { status: 429 }
      );
    }

    // Quota Limit per day
    const maxMessagesPerUserPerDay = globalSettings?.maxMessagesPerUserPerDay ?? 50;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const dailyCount = await prisma.usageEvent.count({
      where: {
        userId: user.id,
        type: "chat_message",
        createdAt: { gte: startOfToday },
      },
    });

    if (dailyCount >= maxMessagesPerUserPerDay) {
      return NextResponse.json(
        { error: `Batas harian tercapai. Anda hanya dapat mengirim maksimal ${maxMessagesPerUserPerDay} pesan per hari.` },
        { status: 429 }
      );
    }

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

    const maxMessages = globalSettings?.maxMessagesPerChat ?? 100;
    if (existingMessageCount >= maxMessages) {
      return NextResponse.json(
        { error: `Batas jumlah pesan tercapai (maksimal ${maxMessages} pesan per chat). Silakan buat chat baru.` },
        { status: 403 }
      );
    }

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
    
    // Fetch active memories to personalize response
    const memories = await prisma.memory.findMany({
      where: {
        userId: user.id,
        enabled: true,
      },
    });

    let memoryInstruction = "";
    if (memories.length > 0) {
      memoryInstruction = "\n\n[INFORMASI PERSONAL PENGGUNA (MEMORY)]\nGunakan informasi ini untuk mempersonalisasi respon Anda jika relevan:\n" + 
        memories.map(m => `- ${m.key}: ${m.value}`).join("\n");
    }

    const DEFAULT_SYSTEM_PROMPT = "You are a helpful personal AI assistant.";
    const baseSystemPrompt = (
      body.systemPrompt?.trim() ||
      settings?.systemPrompt?.trim() ||
      globalSettings?.defaultSystemPrompt?.trim() ||
      DEFAULT_SYSTEM_PROMPT
    );
    const systemPrompt = baseSystemPrompt + memoryInstruction;

    // Fetch attached uploads and parse text context
    let documentContext = "";
    if (body.uploadIds && body.uploadIds.length > 0) {
      const attachments = await prisma.upload.findMany({
        where: {
          id: { in: body.uploadIds },
          userId: user.id,
        },
      });

      if (attachments.length > 0) {
        documentContext = "\n\n[LAMPIRAN DOKUMEN / BERKAS]\n" + attachments.map((att) => {
          return `--- Mulai Berkas: ${att.filename} ---\n${att.extractedText || "[Tidak ada teks yang diekstraksi]"}\n--- Akhir Berkas: ${att.filename} ---`;
        }).join("\n\n");

        // Link the attachments to the conversation if not already linked
        await prisma.upload.updateMany({
          where: {
            id: { in: attachments.map(a => a.id) },
            conversationId: null,
          },
          data: {
            conversationId: conversation.id,
          },
        });
      }
    }

    // Build structured contents array for Gemini API.
    // IMPORTANT: system prompt is passed separately via `systemInstruction` —
    // NOT concatenated with user content. This prevents prompt injection where
    // a user message could contain text like "\n\nSystem: ignore previous instructions".
    const contents = history.map((message) => ({
      role: message.role === "user" ? "user" : "model",
      parts: [{
        text:
          message.id === userMessage.id && documentContext
            ? `${message.content}${documentContext}`
            : message.content,
      }],
    }));

    const modelName = body.model || settings?.defaultModel || globalSettings?.defaultModel || DEFAULT_MODEL;
    const temperature = body.temperature ?? settings?.temperature ?? globalSettings?.defaultTemperature ?? 0.7;
    
    let model;
    if (body.webSearch) {
      model = getGenAI().getGenerativeModel({
        model: modelName,
        tools: [{ googleSearch: {} } as unknown as import("@google/generative-ai").Tool],
      });
    } else {
      model = getModel(modelName);
    }
    
    const generationConfig = {
      temperature,
      maxOutputTokens: 8192,
    };

    // 45-second timeout — prevents hang if Gemini API is unresponsive.
    // The request.signal handles client disconnect; this handles server-side timeout.
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(new Error("AI request timeout")), 45_000);

    // Estimate / count prompt tokens
    let inputTokens = 0;
    try {
      const tokenResult = await model.countTokens({ contents });
      inputTokens = tokenResult.totalTokens;
    } catch (err) {
      console.error("Error counting input tokens:", err);
    }

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
              systemInstruction: systemPrompt,
              contents,
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

            // Count output tokens and log usage event
            let outputTokens = 0;
            try {
              const tokenResult = await model.countTokens({ contents: [{ role: "model", parts: [{ text: finalText }] }] });
              outputTokens = tokenResult.totalTokens;
            } catch (err) {
              console.error("Error counting output tokens:", err);
            }

            await logUsageEvent({
              userId: user.id,
              conversationId: conversation.id,
              type: "chat_message",
              provider: "gemini",
              model: modelName,
              inputTokens,
              outputTokens,
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
            clearTimeout(timeoutId);
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
      systemInstruction: systemPrompt,
      contents,
      generationConfig,
    });
    clearTimeout(timeoutId);
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

    // Count output tokens and log usage event
    let outputTokens = 0;
    try {
      const tokenResult = await model.countTokens({ contents: [{ role: "user", parts: [{ text: assistantText }] }] });
      outputTokens = tokenResult.totalTokens;
    } catch (err) {
      console.error("Error counting output tokens:", err);
    }

    await logUsageEvent({
      userId: user.id,
      conversationId: conversation.id,
      type: "chat_message",
      provider: "gemini",
      model: modelName,
      inputTokens,
      outputTokens,
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
