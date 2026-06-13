import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  title: z.string().trim().min(1, "Judul tidak boleh kosong").max(200).optional(),
  content: z.string().trim().min(1, "Isi tidak boleh kosong").max(20000).optional(),
  tags: z.string().trim().max(300).nullish().transform((v) => (v === undefined ? undefined : v || null)),
  enabled: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const body = PatchSchema.parse(await request.json());

    const existing = await prisma.knowledgeEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pengetahuan tidak ditemukan." }, { status: 404 });
    }

    const entry = await prisma.knowledgeEntry.update({
      where: { id },
      data: {
        title: body.title,
        content: body.content,
        tags: body.tags,
        enabled: body.enabled,
      },
    });

    return NextResponse.json({ entry });
  } catch (error) {
    if ((error as Error).message === "ADMIN_REQUIRED") {
      return authErrorResponse("Akses ditolak. Anda bukan admin.", 403);
    }
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Format data tidak valid."
      : "Gagal memperbarui pengetahuan.";
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;

    const existing = await prisma.knowledgeEntry.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pengetahuan tidak ditemukan." }, { status: 404 });
    }

    await prisma.knowledgeEntry.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if ((error as Error).message === "ADMIN_REQUIRED") {
      return authErrorResponse("Akses ditolak. Anda bukan admin.", 403);
    }
    return NextResponse.json({ error: "Gagal menghapus pengetahuan." }, { status: 500 });
  }
}
