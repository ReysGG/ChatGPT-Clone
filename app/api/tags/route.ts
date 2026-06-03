import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getChatUser } from "@/lib/chat-db";
import { authErrorResponse, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireUser();
    const user = await getChatUser(session.userId);

    const tags = await prisma.tag.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ tags });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "AUTH_REQUIRED") return authErrorResponse("Login diperlukan untuk melihat label.");

    return NextResponse.json(
      { error: message || "Failed to load tags" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireUser();
    const user = await getChatUser(session.userId);
    const body = await request.json().catch(() => ({}));
    const name = (body.name || "").trim();

    if (!name) {
      return NextResponse.json({ error: "Nama label tidak boleh kosong." }, { status: 400 });
    }

    // Find or create tag for this user
    const tag = await prisma.tag.upsert({
      where: {
        userId_name: {
          userId: user.id,
          name,
        },
      },
      update: {},
      create: {
        userId: user.id,
        name,
      },
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "AUTH_REQUIRED") return authErrorResponse("Login diperlukan untuk membuat label.");

    return NextResponse.json(
      { error: message || "Failed to create tag" },
      { status: 500 }
    );
  }
}
