import { PencilSquareIcon } from "@heroicons/react/24/outline";

interface NewChatButtonProps {
  onClick: () => void;
}

export function NewChatButton({ onClick }: NewChatButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
    >
      <PencilSquareIcon className="h-5 w-5 text-white/80" />
      New chat
    </button>
  );
}
