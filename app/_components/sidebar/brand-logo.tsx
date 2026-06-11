import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";
import { PURPLE_GRAD } from "./styles";

export function BrandLogo(): React.ReactElement {
  return (
    <div
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-full text-white shadow-md shadow-primary/20",
        PURPLE_GRAD
      )}
      aria-hidden
    >
      <ChatBubbleLeftRightIcon className="h-4 w-4" />
    </div>
  );
}
