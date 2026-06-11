import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface ChatSearchProps {
  value: string;
  onChange: (next: string) => void;
  ref?: React.Ref<HTMLInputElement>;
}

export function ChatSearch({ value, onChange, ref }: ChatSearchProps): React.ReactElement {
  return (
    <div className="group/search relative">
      <MagnifyingGlassIcon
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within/search:text-foreground/80"
      />
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search chat"
        aria-label="Search chat"
        className="h-10 w-full rounded-lg border border-border bg-muted/10 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground transition-colors outline-none focus:border-primary/40 focus:bg-muted/20"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-muted/15 hover:text-foreground"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
