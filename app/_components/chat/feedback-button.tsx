import {
  HandThumbUpIcon,
  HandThumbDownIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

type FeedbackKind = "up" | "down";

interface FeedbackButtonProps {
  active: boolean;
  kind?: FeedbackKind;
  label: string;
  onClick: () => void;
}

const ICON_BY_KIND: Record<FeedbackKind, React.ComponentType<{ className?: string }>> = {
  up: HandThumbUpIcon,
  down: HandThumbDownIcon,
};

export function FeedbackButton({
  active,
  kind = "up",
  label,
  onClick,
}: FeedbackButtonProps): React.ReactElement {
  const Icon = ICON_BY_KIND[kind];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid size-6 place-items-center rounded transition",
        active
          ? "bg-violet-500/20 text-violet-300"
          : "hover:bg-white/[0.06] hover:text-white"
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
