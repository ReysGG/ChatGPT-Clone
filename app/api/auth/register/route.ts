import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/better-auth";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const RegisterSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi.").max(80),
  email: z.email("Email tidak valid."),
  password: z.string().min(6, "Password minimal 6 karakter."),
});

export async function POST(request: NextRequest) {
  try {
    const body = RegisterSchema.parse(await request.json());

    await auth.api.signUpEmail({
      body: {
        name: body.name,
        email: body.email,
        password: body.password,
      },
      headers: request.headers,
    });

    const session = await getSession();
    return NextResponse.json({ session });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? "Data register tidak valid."
      : "Register gagal. Email mungkin sudah dipakai.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
