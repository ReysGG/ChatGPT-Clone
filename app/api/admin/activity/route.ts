import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const activities = await prisma.activityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Fetch related users to display name/email in the admin panel
    const userIds = Array.from(
      new Set(activities.map((a) => a.userId).filter(Boolean))
    ) as string[];

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const serializedActivities = activities.map((event) => {
      const user = event.userId ? userMap.get(event.userId) : null;
      return {
        id: event.id,
        userId: event.userId,
        userName: user?.name ?? null,
        userEmail: user?.email ?? null,
        type: event.type,
        metadata: event.metadata,
        createdAt: event.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ activities: serializedActivities });
  } catch (error) {
    if (error instanceof Error && error.message === "ADMIN_REQUIRED") {
      return authErrorResponse("Akses admin diperlukan.", 403);
    }
    return NextResponse.json(
      { error: "Gagal memuat log aktivitas admin." },
      { status: 500 }
    );
  }
}
