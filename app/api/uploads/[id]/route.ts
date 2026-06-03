import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, authErrorResponse } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireUser();
    const userId = session.userId;
    if (!userId) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const { id } = await context.params;

    const upload = await prisma.upload.findUnique({
      where: { id },
    });

    if (!upload) {
      return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
    }

    if (upload.userId !== userId) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    return NextResponse.json({ upload });
  } catch (error) {
    if ((error as Error).message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk mengakses berkas.");
    }
    return NextResponse.json(
      { error: "Gagal mengambil detail berkas." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireUser();
    const userId = session.userId;
    if (!userId) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const { id } = await context.params;

    const upload = await prisma.upload.findUnique({
      where: { id },
    });

    if (!upload) {
      return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 404 });
    }

    if (upload.userId !== userId) {
      return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
    }

    // Delete database entry
    await prisma.upload.delete({
      where: { id },
    });

    // Delete physical file
    const absolutePath = path.join(process.cwd(), upload.storagePath);
    if (fs.existsSync(absolutePath)) {
      try {
        await fs.promises.unlink(absolutePath);
      } catch (err) {
        console.error("Gagal menghapus berkas fisik:", err);
      }
    }

    return NextResponse.json({ success: true, message: "Berkas berhasil dihapus." });
  } catch (error) {
    if ((error as Error).message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk menghapus berkas.");
    }
    return NextResponse.json(
      { error: "Gagal menghapus berkas." },
      { status: 500 }
    );
  }
}
