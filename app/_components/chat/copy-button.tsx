import { ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";

interface CopyButtonProps {
  copied: boolean;
  onClick: () => void;
}

export function CopyButton({ copied, onClick }: CopyButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Copy"
      className="grid size-6 place-items-center rounded transition hover:bg-white/[0.06] hover:text-white"
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-violet-400" />
      ) : (
        <ClipboardDocumentIcon className="size-3.5" />
      )}
    </button>
  );
}
