import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownContent } from "@/app/_components/chat/markdown-content";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface SharePageProps {
  params: Promise<{ shareId: string }>;
}

function formatSharedDate(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function SharePage({ params }: SharePageProps): Promise<React.ReactElement> {
  const { shareId } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: {
      shareId,
      isShared: true,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
      user: {
        select: { name: true },
      },
    },
  });

  if (!conversation) notFound();

  return (
    <main className="min-h-screen bg-bg text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6">
        <header className="border-b border-white/[0.08] pb-5">
          <Link href="/" className="text-sm text-muted transition hover:text-white">
            AI Chat
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {conversation.title}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Dibagikan oleh {conversation.user.name || "User"} pada {formatSharedDate(conversation.sharedAt ?? conversation.updatedAt)}
          </p>
        </header>

        <ol className="flex-1 space-y-5 py-6">
          {conversation.messages.map((message) => {
            const isUser = message.role === "user";

            return (
              <li key={message.id} className={isUser ? "flex justify-end" : "flex justify-start"}>
                <article
                  className={
                    isUser
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 px-4 py-2.5 text-sm leading-relaxed text-white"
                      : "max-w-full rounded-2xl rounded-tl-md border border-white/[0.08] bg-card px-4 py-2.5 text-sm leading-relaxed text-white sm:max-w-[85%]"
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
          })}
        </ol>
      </div>
    </main>
  );
}
