import "server-only";
import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

const fallbackSecret = process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET || "dev-secret-change-me";

export const auth = betterAuth({
  appName: "AI Chat Pribadi",
  basePath: "/api/better-auth",
  secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET || fallbackSecret,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 6,
  },
  user: {
    modelName: "User",
  },
  session: {
    modelName: "Session",
  },
  account: {
    modelName: "Account",
  },
  verification: {
    modelName: "Verification",
  },
  plugins: [nextCookies()],
});
