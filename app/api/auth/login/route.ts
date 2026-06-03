import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/better-auth";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  email: z.email("Email tidak valid."),
  password: z.string().min(1, "Password wajib diisi."),
});

export async function POST(request: NextRequest) {
  try {
    const body = LoginSchema.parse(await request.json());

    await auth.api.signInEmail({
      body: {
        email: body.email,
        password: body.password,
        rememberMe: true,
      },
      headers: request.headers,
    });

    const session = await getSession();
    return NextResponse.json({ session });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Data login tidak valid."
      : "Email atau password salah.";

    return NextResponse.json({ error: message }, { status: 401 });
  }
}
