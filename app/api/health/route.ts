import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getModel } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = {};

  // Prisma
  try {
    const count = await prisma.user.count();
    checks.prisma = `ok (users=${count})`;
  } catch (e) {
    checks.prisma = `error: ${(e as Error).message}`;
  }

  // Gemini — a tiny prompt to confirm the key + model are reachable
  try {
    const model = getModel("gemini-2.5-flash");
    const result = await model.generateContent("Reply with the single word: pong");
    const text = result.response.text().trim();
    checks.gemini = `ok (reply="${text.slice(0, 40)}")`;
  } catch (e) {
    checks.gemini = `error: ${(e as Error).message}`;
  }

  const ok = Object.values(checks).every((v) => v.startsWith("ok"));
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 500 });
}
