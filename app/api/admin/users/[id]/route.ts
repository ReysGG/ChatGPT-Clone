import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const adminSession = await requireAdmin();
    const { id: userId } = await context.params;
    
    // Prevent admin from deleting themselves
    if (adminSession.userId === userId) {
      return NextResponse.json(
        { error: "Anda tidak bisa menghapus akun Anda sendiri." },
        { status: 400 }
      );
    }
    
    await prisma.user.delete({
      where: { id: userId },
    });
    
    return NextResponse.json({ success: true, message: "Pengguna berhasil dihapus." });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_REQUIRED") {
      return authErrorResponse("Akses ditolak. Anda bukan admin.", 403);
    }
    return NextResponse.json(
      { error: "Gagal menghapus pengguna." },
      { status: 500 }
    );
  }
}
