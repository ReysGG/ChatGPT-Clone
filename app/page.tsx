import type { Metadata } from "next";
import HomeClient from "./client";

export const metadata: Metadata = {
  title: "Home - AI Chat Pribadi",
  description: "Personal AI chat app — powered by Gemini 2.5 Flash and Prisma Postgres",
};

export default function HomePage(): React.ReactElement {
  return <HomeClient />;
}
