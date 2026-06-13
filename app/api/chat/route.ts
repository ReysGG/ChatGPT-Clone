import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type {
  Content,
  FunctionCall,
  GenerationConfig,
  GenerativeModel,
  Part,
  Tool,
} from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { DEFAULT_MODEL, getGenAI } from "@/lib/ai";
import { getFriendlyChatError } from "@/lib/chat-errors";
import { authErrorResponse, requireUser } from "@/lib/auth";
import {
  assertConversationOwner,
  createTitleFromMessage,
  getChatUser,
  serializeConversation,
  serializeMessage,
} from "@/lib/chat-db";
import { buildFunctionDeclarations, getToolByName } from "@/lib/tools";
import {
  checkUserInput,
  guardToolCall,
  parseBlockedKeywords,
  resolveEnabledTools,
} from "@/lib/guardrails";

export const dynamic = "force-dynamic";
// Tool calls (e.g. image generation via Google Flow) can run for a while,
// so allow up to 3 minutes for the whole agentic turn.
export const maxDuration = 180;

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

/** Build a Gemini model configured with the right tools for this turn. */
function buildChatModel(opts: {
  modelName: string;
  systemPrompt: string;
  generationConfig: GenerationConfig;
  webSearch: boolean;
  enabledTools: Set<string>;
}): GenerativeModel {
  const tools: Tool[] = [];

  if (opts.webSearch) {
    // googleSearch grounding cannot be combined with functionDeclarations,
    // so when web search is requested it takes precedence over custom tools.
    tools.push({ googleSearch: {} } as unknown as Tool);
  } else if (opts.enabledTools.size > 0) {
    tools.push({
      functionDeclarations: buildFunctionDeclarations(opts.enabledTools),
    });
  }

  return getGenAI().getGenerativeModel({
    model: opts.modelName,
    systemInstruction: opts.systemPrompt,
    generationConfig: opts.generationConfig,
    ...(tools.length > 0 ? { tools } : {}),
  });
}

interface AgentRunResult {
  text: string;
}

/**
 * Agentic loop: send the message, stream text, and whenever the model emits
 * function calls, run them through guardrails + the tool registry and feed the
 * results back — until the model produces a final answer (or budgets are hit).
 */
async function runAgent(opts: {
  model: GenerativeModel;
  history: Content[];
  userParts: Part[];
  enabledTools: Set<string>;
  maxToolCalls: number;
  ctx: { userId: string; conversationId: string };
  emit: (event: string, data: unknown) => void;
  signal: AbortSignal;
}): Promise<AgentRunResult> {
  const chat = opts.model.startChat({ history: opts.history });

  let pending: Array<string | Part> = opts.userParts;
  let fullText = "";
  let toolCallsUsed = 0;
  const maxSteps = 6;

  for (let step = 0; step < maxSteps; step += 1) {
    if (opts.signal.aborted) break;

    const result = await chat.sendMessageStream(pending);

    for await (const chunk of result.stream) {
      if (opts.signal.aborted) break;
      let text = "";
      try {
        text = chunk.text();
      } catch {
        text = "";
      }
      if (text) {
        fullText += text;
        opts.emit("delta", { text });
      }
    }

    const response = await result.response;
    let calls: FunctionCall[] = [];
    try {
      calls = response.functionCalls() ?? [];
    } catch {
      calls = [];
    }

    if (calls.length === 0) break; // final answer produced

    const responseParts: Part[] = [];
    for (const call of calls) {
      if (toolCallsUsed >= opts.maxToolCalls) {
        responseParts.push({
          functionResponse: {
            name: call.name,
            response: {
              error:
                "Batas jumlah pemanggilan tool per pesan tercapai. Lanjutkan tanpa memanggil tool lagi.",
            },
          },
        });
        continue;
      }
      toolCallsUsed += 1;

      opts.emit("tool_call", { name: call.name });

      const guard = guardToolCall(call.name, call.args, {
        enabledTools: opts.enabledTools,
      });
      if (!guard.allowed) {
        opts.emit("tool_result", {
          name: call.name,
          ok: false,
          error: guard.reason,
        });
        responseParts.push({
          functionResponse: {
            name: call.name,
            response: { error: guard.reason },
          },
        });
        continue;
      }

      const tool = getToolByName(call.name);
      if (!tool) {
        responseParts.push({
          functionResponse: {
            name: call.name,
            response: { error: `Tool tidak ditemukan: ${call.name}` },
          },
        });
        continue;
      }

      try {
        const out = await tool.execute(guard.args, {
          userId: opts.ctx.userId,
          conversationId: opts.ctx.conversationId,
          emit: opts.emit,
          signal: opts.signal,
        });

        if (out.artifactMarkdown) {
          const md = `${fullText ? "\n\n" : ""}${out.artifactMarkdown}`;
          fullText += md;
          opts.emit("delta", { text: md });
        }

        opts.emit("tool_result", { name: call.name, ok: true });
        responseParts.push({
          functionResponse: { name: call.name, response: out.response },
        });
      } catch (error) {
        const message = (error as Error).message || "Tool execution failed";
        opts.emit("tool_result", { name: call.name, ok: false, error: message });
        responseParts.push({
          functionResponse: {
            name: call.name,
            response: { error: message },
          },
        });
      }
    }

    pending = responseParts;
  }

  return { text: fullText.trim() };
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

    const settings = await prisma.setting.findFirst({ where: { userId: user.id } });

    // Input guardrails (configurable keyword blocklist)
    const guardrailsEnabled =
      (globalSettings?.guardrailsEnabled ?? true) &&
      (settings?.guardrailsEnabled ?? true);
    const blockedKeywords = parseBlockedKeywords(
      globalSettings?.blockedKeywords,
      settings?.blockedKeywords
    );
    const inputGuard = checkUserInput(body.message, {
      guardrailsEnabled,
      blockedKeywords,
    });
    if (!inputGuard.allowed) {
      return NextResponse.json(
        { error: inputGuard.reason ?? "Pesan diblokir oleh guardrails." },
        { status: 400 }
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

    const historyRows = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 24,
    });

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

    // Resolve which tools the assistant may call this turn.
    const enabledTools = resolveEnabledTools(globalSettings, settings);
    const toolsActive = !body.webSearch && enabledTools.size > 0;

    let toolsInstruction = "";
    if (toolsActive) {
      toolsInstruction =
        "\n\n[KEMAMPUAN ALAT/TOOL]\n" +
        "Kamu adalah asisten agentic yang BISA memanggil fungsi/tool berikut, dan HARUS benar-benar memanggilnya (bukan sekadar menjelaskan atau menolak):\n" +
        Array.from(enabledTools)
          .map((name) => `- ${name}`)
          .join("\n") +
        "\nAturan:\n" +
        "- Jika pengguna meminta membuat/menggambar/menghasilkan gambar, ilustrasi, foto, atau logo, WAJIB panggil generate_image. Jangan menjawab bahwa kamu tidak bisa membuat gambar.\n" +
        "- Gunakan search_knowledge sebelum menjawab hal yang mungkin tersimpan di basis pengetahuan pribadi pengguna.\n" +
        "- Setelah hasil tool diterima, lanjutkan dengan jawaban akhir yang ringkas dalam bahasa pengguna.";
    }

    const DEFAULT_SYSTEM_PROMPT = "You are a helpful personal AI assistant.";
    const baseSystemPrompt = (
      body.systemPrompt?.trim() ||
      settings?.systemPrompt?.trim() ||
      globalSettings?.defaultSystemPrompt?.trim() ||
      DEFAULT_SYSTEM_PROMPT
    );
    const systemPrompt = baseSystemPrompt + memoryInstruction + toolsInstruction;

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

    // Build the chat history for startChat — everything EXCEPT the just-saved
    // user message, which is sent separately as the new turn. The system
    // prompt is provided via `systemInstruction`, never concatenated with user
    // content (prevents prompt-injection via crafted message text).
    const priorRows = historyRows.filter((m) => m.id !== userMessage.id);
    const chatHistory: Content[] = priorRows.map((message) => ({
      role: message.role === "user" ? "user" : "model",
      parts: [{ text: message.content }],
    }));
    const userParts: Part[] = [
      { text: documentContext ? `${body.message}${documentContext}` : body.message },
    ];

    const modelName = body.model || settings?.defaultModel || globalSettings?.defaultModel || DEFAULT_MODEL;
    const temperature = body.temperature ?? settings?.temperature ?? globalSettings?.defaultTemperature ?? 0.7;

    const generationConfig: GenerationConfig = {
      temperature,
      maxOutputTokens: 8192,
    };

    const model = buildChatModel({
      modelName,
      systemPrompt,
      generationConfig,
      webSearch: Boolean(body.webSearch),
      enabledTools,
    });

    const maxToolCalls = globalSettings?.maxToolCallsPerMessage ?? 4;

    // Best-effort input token count
    let inputTokens = 0;
    try {
      const tokenResult = await model.countTokens({
        contents: [...chatHistory, { role: "user", parts: userParts }],
      });
      inputTokens = tokenResult.totalTokens;
    } catch (err) {
      console.error("Error counting input tokens:", err);
    }

    if (body.stream) {
      const stream = new ReadableStream({
        async start(controller) {
          const emit = (event: string, data: unknown) => {
            try {
              controller.enqueue(encodeEvent(event, data));
            } catch {
              /* controller already closed */
            }
          };

          try {
            emit("meta", {
              conversation: serializeConversation(conversation),
              userMessage: serializeMessage(userMessage),
            });

            const { text } = await runAgent({
              model,
              history: chatHistory,
              userParts,
              enabledTools,
              maxToolCalls,
              ctx: { userId: user.id, conversationId: conversation.id },
              emit,
              signal: request.signal,
            });

            const finalText = text || "Maaf, saya belum bisa membuat jawaban.";
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

            let outputTokens = 0;
            try {
              const tokenResult = await model.countTokens({
                contents: [{ role: "model", parts: [{ text: finalText }] }],
              });
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

            emit("done", {
              conversation: serializeConversation(updatedConversation),
              assistantMessage: serializeMessage(assistantMessage),
            });
          } catch (error) {
            emit("error", { error: getFriendlyChatError(error) });
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

    // Non-streaming path — run the same agentic loop with a no-op emitter.
    const { text } = await runAgent({
      model,
      history: chatHistory,
      userParts,
      enabledTools,
      maxToolCalls,
      ctx: { userId: user.id, conversationId: conversation.id },
      emit: () => {},
      signal: request.signal,
    });

    const assistantText = text || "Maaf, saya belum bisa membuat jawaban.";

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

    let outputTokens = 0;
    try {
      const tokenResult = await model.countTokens({
        contents: [{ role: "model", parts: [{ text: assistantText }] }],
      });
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
