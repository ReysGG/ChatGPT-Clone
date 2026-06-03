import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth";

export type AuthRole = "guest" | "user" | "admin";

export interface AuthSession {
  role: AuthRole;
  isAuthenticated: boolean;
  userId?: string;
  email?: string;
  name?: string;
  image?: string | null;
}

function isAdminEmail(email?: string | null): boolean {
  const configured = process.env.ADMIN_EMAIL;
  return Boolean(configured && email && email.toLowerCase() === configured.toLowerCase());
}

export async function getSession(): Promise<AuthSession> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return { role: "guest", isAuthenticated: false };
  }

  const role: AuthRole = isAdminEmail(session.user.email) ? "admin" : "user";

  return {
    role,
    isAuthenticated: true,
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  };
}

export async function requireUser(): Promise<AuthSession> {
  const session = await getSession();
  if (!session.isAuthenticated) throw new Error("AUTH_REQUIRED");
  return session;
}

export async function requireAdmin(): Promise<AuthSession> {
  const session = await getSession();
  if (session.role !== "admin") throw new Error("ADMIN_REQUIRED");
  return session;
}

export function authErrorResponse(message = "Login diperlukan untuk mengirim pesan.", status = 401): Response {
  return Response.json({ error: message }, { status });
}
