import { SparklesIcon } from "@heroicons/react/24/outline";
import { LoaderOne } from "@/components/ui/loader";
import { TextAnimate } from "@/components/ui/text-animate";

export function TypingIndicator(): React.ReactElement {
  return (
    <li className="flex gap-3" aria-live="polite" aria-label="Google sedang mengetik">
      <div
        className="grid size-8 shrink-0 place-items-center rounded-full text-primary bg-primary/10 border border-primary/20"
        aria-hidden
      >
        <SparklesIcon className="size-4 animate-pulse text-primary" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="inline-flex items-center gap-3 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm shadow-black/5">
          <div className="scale-75 [&>div>div]:h-2.5 [&>div>div]:w-2.5 [&>div>div]:border-primary/40 [&>div>div]:from-primary [&>div>div]:to-primary-container">
            <LoaderOne />
          </div>
          <TextAnimate
            as="span"
            by="character"
            animation="blurIn"
            duration={1.4}
            className="text-xs font-medium text-foreground/75"
            segmentClassName="whitespace-pre"
          >
            Google sedang mengetik...
          </TextAnimate>
        </div>
      </div>
    </li>
  );
}
