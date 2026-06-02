import { XMarkIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { PURPLE_GRAD, PURPLE_GRAD_HOVER } from "./styles";

interface UpgradeCardProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export function UpgradeCard({
  open,
  onClose,
  onUpgrade,
}: UpgradeCardProps): React.ReactElement | null {
  if (!open) return null;
  return (
    <div
      className="relative rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/[0.08] to-indigo-500/[0.04] p-4"
      role="alert"
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        className="absolute right-2 top-2 rounded p-1 text-muted hover:bg-white/10 hover:text-white"
      >
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
      <div
        className={cn(
          "mb-2.5 grid h-9 w-9 place-items-center rounded-full text-white",
          PURPLE_GRAD
        )}
      >
        <SparklesIcon className="h-4 w-4" />
      </div>
      <p className="text-sm font-semibold text-white">Upgrade to PRO</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Unlock more projects, longer context, and file uploads up to 50MB.
      </p>
      <button
        type="button"
        onClick={onUpgrade}
        className={cn(
          "mt-3 w-full rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-md shadow-violet-500/20",
          PURPLE_GRAD,
          PURPLE_GRAD_HOVER
        )}
      >
        Upgrade Now
      </button>
    </div>
  );
}
