import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id: userId } = await context.params;
    
    // Delete all sessions for the user
    await prisma.session.deleteMany({
      where: { userId },
    });
    
    return NextResponse.json({ success: true, message: "User forced to logout successfully." });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_REQUIRED") {
      return authErrorResponse("Akses ditolak. Anda bukan admin.", 403);
    }
    return NextResponse.json(
      { error: "Gagal mengeluarkan paksa pengguna." },
      { status: 500 }
    );
  }
}
