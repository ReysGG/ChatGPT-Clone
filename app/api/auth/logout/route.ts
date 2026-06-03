import { NextResponse } from "next/server";
import { auth } from "@/lib/better-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await auth.api.signOut({ headers: request.headers });
  return NextResponse.json({ session: { role: "guest", isAuthenticated: false } });
}
