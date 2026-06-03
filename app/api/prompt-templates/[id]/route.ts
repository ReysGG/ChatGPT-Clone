import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, authErrorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const PromptTemplatePatchSchema = z.object({
  title: z.string().trim().min(1, "Judul tidak boleh kosong").max(100).optional(),
  body: z.string().trim().min(1, "Isi prompt tidak boleh kosong").max(5000).optional(),
  category: z.string().trim().min(1).max(50).optional(),
  isGlobal: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    
    // Find the template
    const template = await prisma.promptTemplate.findUnique({
      where: { id },
    });
    
    if (!template) {
      return NextResponse.json({ error: "Template tidak ditemukan" }, { status: 404 });
    }
    
    // Check ownership or admin status
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin = adminEmail && session.email?.toLowerCase() === adminEmail.toLowerCase();
    
    if (template.userId !== session.userId && !isAdmin) {
      return NextResponse.json({ error: "Anda tidak memiliki akses untuk mengubah template ini" }, { status: 403 });
    }
    
    const body = PromptTemplatePatchSchema.parse(await request.json());
    
    const updated = await prisma.promptTemplate.update({
      where: { id },
      data: {
        title: body.title,
        body: body.body,
        category: body.category,
        isGlobal: isAdmin ? body.isGlobal : undefined, // Only admin can update global status
      },
    });
    
    return NextResponse.json({ template: updated });
  } catch (error) {
    if ((error as Error).message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk memperbarui template.");
    }
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Format data template tidak valid."
      : "Gagal memperbarui template prompt.";
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireUser();
    const { id } = await context.params;
    
    const template = await prisma.promptTemplate.findUnique({
      where: { id },
    });
    
    if (!template) {
      return NextResponse.json({ error: "Template tidak ditemukan" }, { status: 404 });
    }
    
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin = adminEmail && session.email?.toLowerCase() === adminEmail.toLowerCase();
    
    if (template.userId !== session.userId && !isAdmin) {
      return NextResponse.json({ error: "Anda tidak memiliki akses untuk menghapus template ini" }, { status: 403 });
    }
    
    await prisma.promptTemplate.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true, message: "Template berhasil dihapus." });
  } catch (error) {
    if ((error as Error).message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk menghapus template.");
    }
    return NextResponse.json(
      { error: "Gagal menghapus template prompt." },
      { status: 500 }
    );
  }
}
