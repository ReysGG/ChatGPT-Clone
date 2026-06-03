import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireUser, authErrorResponse } from "@/lib/auth";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

const PromptTemplateSchema = z.object({
  title: z.string().trim().min(1, "Judul tidak boleh kosong").max(100),
  body: z.string().trim().min(1, "Isi prompt tidak boleh kosong").max(5000),
  category: z.string().trim().min(1).max(50).optional(),
  isGlobal: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    
    // Default search condition: global templates
    const conditions: Record<string, unknown>[] = [{ isGlobal: true }];
    
    // If authenticated, also fetch user-owned templates
    if (session.isAuthenticated) {
      conditions.push({ userId: session.userId });
    }
    
    const templates = await prisma.promptTemplate.findMany({
      where: {
        OR: conditions,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal memuat template prompt." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser();
    const body = PromptTemplateSchema.parse(await request.json());
    
    // Check if user is admin
    const adminEmail = config.adminEmail;
    const isAdmin = adminEmail && session.email?.toLowerCase() === adminEmail.toLowerCase();
    
    const newTemplate = await prisma.promptTemplate.create({
      data: {
        title: body.title,
        body: body.body,
        category: body.category || "Umum",
        userId: session.userId,
        isGlobal: isAdmin ? (body.isGlobal ?? false) : false,
      },
    });
    
    return NextResponse.json({ template: newTemplate });
  } catch (error) {
    if ((error as Error).message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk membuat template.");
    }
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Format data template tidak valid."
      : "Gagal membuat template prompt.";
    const status = error instanceof z.ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
