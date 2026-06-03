import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/better-auth";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivityEvent } from "@/lib/activity";

export const dynamic = "force-dynamic";

const RegisterSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi.").max(80),
  email: z.email("Email tidak valid."),
  password: z.string().min(6, "Password minimal 6 karakter."),
});

export async function POST(request: NextRequest) {
  let requestEmail = "unknown";
  try {
    const globalSettings = await prisma.appSetting.findFirst();
    if (globalSettings && !globalSettings.registrationEnabled) {
      return NextResponse.json(
        { error: "Pendaftaran akun baru sedang dinonaktifkan oleh administrator." },
        { status: 403 }
      );
    }

    const body = RegisterSchema.parse(await request.json());
    requestEmail = body.email;

    await auth.api.signUpEmail({
      body: {
        name: body.name,
        email: body.email,
        password: body.password,
      },
      headers: request.headers,
    });

    const session = await getSession();

    // Log successful registration
    if (session.isAuthenticated && session.userId) {
      void logActivityEvent(session.userId, "register_success", {
        name: body.name,
        email: body.email,
      });
    }

    return NextResponse.json({ session });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Data register tidak valid."
      : "Register gagal. Email mungkin sudah dipakai.";

    // Log failed registration
    void logActivityEvent(null, "register_failed", {
      email: requestEmail,
      reason: message,
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

