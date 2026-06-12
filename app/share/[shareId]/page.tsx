import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/app/_components/chat/markdown-content";
import { CopyButton } from "./copy-button";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { getSharedConversation } from "@/app/actions/share.actions";

export const dynamic = "force-dynamic";

import type { Metadata } from "next";

interface SharePageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { shareId } = await params;
  return {
    title: `Shared Conversation`,
    description: `View shared AI conversation ${shareId}`,
  };
}

const sharedDateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatSharedDate(date: Date): string {
  return sharedDateFormatter.format(date);
}

export default async function SharePage({ params }: SharePageProps): Promise<React.ReactElement> {
  const { shareId } = await params;
  const conversation = await getSharedConversation(shareId);

  if (!conversation) notFound();

  return (
    <main className="min-h-screen bg-bg text-foreground selection:bg-primary/20">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
        <header className="border-b border-border pb-5">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeftIcon className="h-3 w-3" />
              <span>Back to app</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-500 dark:text-emerald-400">
                Shared conversation
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {conversation.title}
              </h1>
              <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
                Dibagikan oleh <span className="font-medium text-foreground/80">{conversation.user.name || "User"}</span> pada {formatSharedDate(conversation.sharedAt ?? conversation.updatedAt)}
              </p>
            </div>
            <div className="shrink-0">
              <CopyButton />
            </div>
          </div>
        </header>

        <ol className="flex-1 space-y-5 py-6">
          {conversation.messages.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Tidak ada pesan dalam percakapan ini.
            </div>
          ) : (
            conversation.messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <li key={message.id} className={isUser ? "flex justify-end" : "flex justify-start"}>
                  <article
                    className={
                      isUser
                        ? "max-w-[85%] rounded-2xl rounded-br-md bg-card border border-border px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm"
                        : "max-w-full rounded-2xl rounded-tl-md border border-border bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm sm:max-w-[85%]"
                    }
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <MarkdownContent content={message.content} />
                    )}
                  </article>
                </li>
              );
            })
          )}
        </ol>
      </div>
    </main>
  );
}
