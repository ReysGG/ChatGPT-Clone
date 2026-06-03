import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, authErrorResponse } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { logActivityEvent } from "@/lib/activity";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireUser();
    const userId = session.userId;
    if (!userId) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const uploads = await prisma.upload.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ uploads });
  } catch (error) {
    if ((error as Error).message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk melihat unggahan.");
    }
    return NextResponse.json(
      { error: "Gagal mengambil daftar unggahan." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser();
    const userId = session.userId;
    if (!userId) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const conversationId = formData.get("conversationId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 400 });
    }

    // Limit file size to 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran berkas maksimal 5MB." }, { status: 400 });
    }

    const filename = file.name;
    const mimeType = file.type;
    const sizeBytes = file.size;

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Extract text for text-friendly files
    let extractedText: string | null = null;
    const extension = path.extname(filename).toLowerCase();
    const textExtensions = [".txt", ".md", ".json", ".csv", ".tsv", ".js", ".ts", ".tsx", ".jsx", ".html", ".css"];

    if (textExtensions.includes(extension) || mimeType.startsWith("text/") || mimeType === "application/json") {
      extractedText = fileBuffer.toString("utf-8");
      // Truncate if too long (max 100k characters for safety)
      if (extractedText.length > 100000) {
        extractedText = extractedText.substring(0, 100000) + "\n[Teks dipotong karena terlalu panjang]";
      }
    } else {
      // Fallback message for unsupported extraction
      extractedText = `[Konten Biner: Ekstraksi teks tidak didukung untuk tipe file ${mimeType || extension}]`;
    }

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique storage name
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${extension}`;
    const storagePath = path.join("uploads", uniqueFilename);
    const absolutePath = path.join(uploadDir, uniqueFilename);

    // Write file to disk
    await fs.promises.writeFile(absolutePath, fileBuffer);

    // Create database entry
    const upload = await prisma.upload.create({
      data: {
        userId,
        conversationId: conversationId || null,
        filename,
        mimeType,
        sizeBytes,
        storagePath,
        extractedText,
      },
    });

    void logActivityEvent(userId, "file_uploaded", {
      filename,
      mimeType,
      sizeBytes,
      uploadId: upload.id,
      conversationId: conversationId || null,
    });

    return NextResponse.json({ upload });
  } catch (error) {
    if ((error as Error).message === "AUTH_REQUIRED") {
      return authErrorResponse("Login diperlukan untuk mengunggah berkas.");
    }
    return NextResponse.json(
      { error: "Gagal mengunggah berkas." },
      { status: 500 }
    );
  }
}
