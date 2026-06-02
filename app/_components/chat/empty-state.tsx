import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

const EMPTY_TITLE = "Mulai percakapan";
const EMPTY_DESCRIPTION =
  "Ketik pesan di bawah, atau drag & drop file untuk melampirkannya.";

export function EmptyState(): React.ReactElement {
  return (
    <div className="grid h-full place-items-center text-center">
      <div>
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/10 ring-1 ring-violet-500/20">
          <ChatBubbleLeftRightIcon className="size-6 text-violet-300" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">{EMPTY_TITLE}</h2>
        <p className="mt-1 text-sm text-muted">{EMPTY_DESCRIPTION}</p>
      </div>
    </div>
  );
}
