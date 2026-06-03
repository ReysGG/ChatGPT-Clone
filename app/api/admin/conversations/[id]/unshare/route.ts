import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    
    const updated = await prisma.conversation.update({
      where: { id },
      data: {
        isShared: false,
        shareId: null,
        sharedAt: null,
      },
    });
    
    return NextResponse.json({ success: true, conversation: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_REQUIRED") {
      return authErrorResponse("Akses ditolak. Anda bukan admin.", 403);
    }
    return NextResponse.json(
      { error: "Gagal membatalkan pembagian percakapan." },
      { status: 500 }
    );
  }
}
