import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, authErrorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

const UpdateMemorySchema = z.object({
  key: z.string().trim().min(1, "Kunci memori tidak boleh kosong").max(100).optional(),
  value: z.string().trim().min(1, "Isi memori tidak boleh kosong").max(1000).optional(),
  enabled: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireUser();
    const userId = session.userId;
    if (!userId) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }
    const { id } = await context.params;
    const body = UpdateMemorySchema.parse(await request.json());
    
    // Find existing memory
    const existing = await prisma.memory.findUnique({
      where: { id },
    });
    
    if (!existing) {
      return NextResponse.json({ error: "Memori tidak ditemukan." }, { status: 404 });
    }
    
    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }
    
    // If key is being updated, check for case-insensitive duplicate
    if (body.key && body.key.toLowerCase() !== existing.key.toLowerCase()) {
      const duplicate = await prisma.memory.findFirst({
        where: {
          userId,
          key: {
            equals: body.key,
            mode: "insensitive",
          },
          id: {
            not: id,
          },
        },
      });
      
      if (duplicate) {
        return NextResponse.json(
          { error: `Memori dengan kunci "${body.key}" sudah ada.` },
          { status: 400 }
        );
      }
    }
    
    const updated = await prisma.memory.update({
      where: { id },
      data: {
        key: body.key,
        value: body.value,
        enabled: body.enabled,
      },
    });
    
    return NextResponse.json({ memory: updated });
  } catch (error) {
    if ((error as Error).message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk memproses memori.");
    }
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Format data memori tidak valid."
      : "Gagal memperbarui memori.";
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireUser();
    const userId = session.userId;
    if (!userId) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }
    const { id } = await context.params;
    
    // Find existing memory
    const existing = await prisma.memory.findUnique({
      where: { id },
    });
    
    if (!existing) {
      return NextResponse.json({ error: "Memori tidak ditemukan." }, { status: 404 });
    }
    
    if (existing.userId !== userId) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }
    
    await prisma.memory.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true, message: "Memori berhasil dihapus." });
  } catch (error) {
    if ((error as Error).message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk menghapus memori.");
    }
    return NextResponse.json(
      { error: "Gagal menghapus memori." },
      { status: 500 }
    );
  }
}
