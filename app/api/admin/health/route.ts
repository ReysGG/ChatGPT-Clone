import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    
    // Test database connection and calculate latency
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Math.round(performance.now() - start);
    
    // Check environment variables
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
    const geminiKeyPreview = hasGeminiKey
      ? `${process.env.GEMINI_API_KEY!.slice(0, 4)}...${process.env.GEMINI_API_KEY!.slice(-4)}`
      : "Not Configured";
      
    return NextResponse.json({
      status: "healthy",
      database: {
        status: "connected",
        latencyMs,
      },
      gemini: {
        configured: hasGeminiKey,
        keyPreview: geminiKeyPreview,
      },
      environment: process.env.NODE_ENV,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_REQUIRED") {
      return authErrorResponse("Akses ditolak. Anda bukan admin.", 403);
    }
    return NextResponse.json(
      {
        status: "unhealthy",
        error: "Gagal memeriksa kesehatan sistem. Database tidak merespons.",
      },
      { status: 500 }
    );
  }
}
