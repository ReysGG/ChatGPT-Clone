import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, authErrorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

const KnowledgeSchema = z.object({
  title: z.string().trim().min(1, "Judul tidak boleh kosong").max(200),
  content: z.string().trim().min(1, "Isi pengetahuan tidak boleh kosong").max(20000),
  tags: z.string().trim().max(300).nullish().transform((v) => v || null),
  enabled: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await requireUser();
    const userId = session.userId;
    if (!userId) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const entries = await prisma.knowledgeEntry.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    if ((error as Error).message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk memuat knowledge base.");
    }
    return NextResponse.json(
      { error: "Gagal memuat knowledge base." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser();
    const userId = session.userId;
    if (!userId) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }
    const body = KnowledgeSchema.parse(await request.json());

    const entry = await prisma.knowledgeEntry.create({
      data: {
        userId,
        title: body.title,
        content: body.content,
        tags: body.tags,
        enabled: body.enabled ?? true,
        source: "manual",
      },
    });

    return NextResponse.json({ entry });
  } catch (error) {
    if ((error as Error).message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk menambah pengetahuan.");
    }
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Format data pengetahuan tidak valid."
      : "Gagal menyimpan pengetahuan.";
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
