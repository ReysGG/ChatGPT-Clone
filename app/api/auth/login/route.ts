import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/better-auth";
import { getSession } from "@/lib/auth";
import { logActivityEvent } from "@/lib/activity";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.email("Email tidak valid."),
  password: z.string().min(1, "Password wajib diisi."),
});

export async function POST(request: NextRequest) {
  let requestEmail = "unknown";
  try {
    const body = LoginSchema.parse(await request.json());
    requestEmail = body.email;

    await auth.api.signInEmail({
      body: {
        email: body.email,
        password: body.password,
        rememberMe: true,
      },
      headers: request.headers,
    });

    const session = await getSession();
    
    // Log successful login
    if (session.isAuthenticated && session.userId) {
      void logActivityEvent(session.userId, "login_success", {
        email: session.email,
      });
    }

    return NextResponse.json({ session });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Data login tidak valid."
      : "Email atau password salah.";

    // Log failed login
    void logActivityEvent(null, "login_failed", {
      email: requestEmail,
      reason: message,
    });

    return NextResponse.json({ error: message }, { status: 401 });
  }
}

