import { XMarkIcon } from "@heroicons/react/24/outline";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { BrandLogo } from "./brand-logo";
import { Typography } from "./primitives";

interface SidebarHeaderProps {
  onClose: () => void;
}

export function SidebarHeader({ onClose }: SidebarHeaderProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <div className="flex items-center gap-2.5">
        <BrandLogo />
        <Typography
          variant="h5"
          className="!text-base !font-semibold text-foreground"
        >
          AI Chat
        </Typography>
      </div>
      <div className="flex items-center gap-1">
        <AnimatedThemeToggler
          variant="circle"
          className="rounded-md p-1.5 text-foreground hover:bg-black/5 dark:hover:bg-white/10"
        />
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-white hover:bg-white/10 md:hidden"
          aria-label="Close sidebar"
          title="Close sidebar"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
