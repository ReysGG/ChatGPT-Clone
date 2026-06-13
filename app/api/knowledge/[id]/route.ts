import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, authErrorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

const UpdateKnowledgeSchema = z.object({
  title: z.string().trim().min(1, "Judul tidak boleh kosong").max(200).optional(),
  content: z.string().trim().min(1, "Isi pengetahuan tidak boleh kosong").max(20000).optional(),
  tags: z.string().trim().max(300).nullish().transform((v) => (v === undefined ? undefined : v || null)),
  enabled: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireUser();
    const userId = session.userId;
    if (!userId) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }
    const { id } = await context.params;
    const body = UpdateKnowledgeSchema.parse(await request.json());

    const existing = await prisma.knowledgeEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pengetahuan tidak ditemukan." }, { status: 404 });
    }
    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    const updated = await prisma.knowledgeEntry.update({
      where: { id },
      data: {
        title: body.title,
        content: body.content,
        tags: body.tags,
        enabled: body.enabled,
      },
    });

    return NextResponse.json({ entry: updated });
  } catch (error) {
    if ((error as Error).message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk memproses pengetahuan.");
    }
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Format data pengetahuan tidak valid."
      : "Gagal memperbarui pengetahuan.";
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireUser();
    const userId = session.userId;
    if (!userId) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }
    const { id } = await context.params;

    const existing = await prisma.knowledgeEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pengetahuan tidak ditemukan." }, { status: 404 });
    }
    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    await prisma.knowledgeEntry.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Pengetahuan berhasil dihapus." });
  } catch (error) {
    if ((error as Error).message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk menghapus pengetahuan.");
    }
    return NextResponse.json(
      { error: "Gagal menghapus pengetahuan." },
      { status: 500 }
    );
  }
}
