import { PlusIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";
import { PURPLE_GRAD, PURPLE_GRAD_HOVER } from "./styles";

interface NewChatButtonProps {
  onClick: () => void;
}

export function NewChatButton({ onClick }: NewChatButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20",
        PURPLE_GRAD,
        PURPLE_GRAD_HOVER
      )}
    >
      <PlusIcon className="h-5 w-5" />
      New chat
    </button>
  );
}
