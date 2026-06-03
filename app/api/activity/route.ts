import { NextRequest, NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await requireUser();
    const activities = await prisma.activityEvent.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ activities });
  } catch (error) {
    if (error instanceof Error && error.message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk memuat aktivitas.", 401);
    }
    return NextResponse.json(
      { error: "Gagal memuat aktivitas." },
      { status: 500 }
    );
  }
}
