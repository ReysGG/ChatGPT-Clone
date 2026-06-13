import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

const KnowledgeSchema = z.object({
  title: z.string().trim().min(1, "Judul tidak boleh kosong").max(200),
  content: z.string().trim().min(1, "Isi pengetahuan tidak boleh kosong").max(20000),
  tags: z.string().trim().max(300).nullish().transform((v) => v || null),
  enabled: z.boolean().optional(),
});

/** Admin view of every knowledge-base entry (global + per-user). */
export async function GET() {
  try {
    await requireAdmin();

    const entries = await prisma.knowledgeEntry.findMany({
      take: 200,
      orderBy: [{ isGlobal: "desc" }, { updatedAt: "desc" }],
      include: { user: { select: { email: true, name: true } } },
    });

    return NextResponse.json({
      entries: entries.map((e) => ({
        id: e.id,
        title: e.title,
        tags: e.tags,
        enabled: e.enabled,
        isGlobal: e.isGlobal,
        source: e.source,
        content: e.content,
        contentPreview: e.content.length > 160 ? `${e.content.slice(0, 160)}…` : e.content,
        contentLength: e.content.length,
        userEmail: e.user?.email ?? null,
        userName: e.user?.name ?? null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    if ((error as Error).message === "ADMIN_REQUIRED") {
      return authErrorResponse("Akses ditolak. Anda bukan admin.", 403);
    }
    return NextResponse.json(
      { error: "Gagal memuat knowledge base." },
      { status: 500 }
    );
  }
}

/** Create a GLOBAL knowledge entry installed by the admin (used for all users). */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = KnowledgeSchema.parse(await request.json());

    const entry = await prisma.knowledgeEntry.create({
      data: {
        userId: null,
        isGlobal: true,
        source: "admin",
        title: body.title,
        content: body.content,
        tags: body.tags,
        enabled: body.enabled ?? true,
      },
    });

    return NextResponse.json({ entry });
  } catch (error) {
    if ((error as Error).message === "ADMIN_REQUIRED") {
      return authErrorResponse("Akses ditolak. Anda bukan admin.", 403);
    }
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Format data tidak valid."
      : "Gagal membuat pengetahuan.";
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
