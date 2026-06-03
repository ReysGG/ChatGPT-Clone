import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast-provider";

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
    <html lang="id" className="dark" suppressHydrationWarning>
      <body className="theme bg-bg text-white antialiased" suppressHydrationWarning>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

