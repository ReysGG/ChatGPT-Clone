import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "AI Chat Pribadi",
  description:
    "Personal AI chat app — powered by Gemini 2.5 Flash and Prisma Postgres",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark">
      <body className="theme bg-bg text-white antialiased">{children}</body>
    </html>
  );
}
