import "server-only";

export const config = {
  databaseUrl: process.env.DATABASE_URL || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  betterAuthSecret: process.env.BETTER_AUTH_SECRET || "",
  betterAuthUrl: process.env.BETTER_AUTH_URL || "",
  nodeEnv: process.env.NODE_ENV || "development",
  adminEmail: process.env.ADMIN_EMAIL || "",
};
