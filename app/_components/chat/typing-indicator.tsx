import { SparklesIcon } from "@heroicons/react/24/outline";
import { LoaderOne } from "@/components/ui/loader";
import { TextAnimate } from "@/components/ui/text-animate";

const ASSISTANT_AVATAR_STYLE = {
  background:
    "linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(79, 70, 229, 0.15) 100%)",
} as const;

export function TypingIndicator(): React.ReactElement {
  return (
    <li className="flex gap-3" aria-live="polite" aria-label="Google sedang mengetik">
      <div
        className="grid size-8 shrink-0 place-items-center rounded-full text-violet-200 ring-1 ring-violet-500/20"
        style={ASSISTANT_AVATAR_STYLE}
        aria-hidden
      >
        <SparklesIcon className="size-4 animate-pulse text-violet-300" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="inline-flex items-center gap-3 rounded-2xl rounded-tl-md border border-white/[0.06] bg-card px-4 py-3 text-sm text-muted shadow-sm shadow-black/20">
          <div className="scale-75 [&>div>div]:h-2.5 [&>div>div]:w-2.5 [&>div>div]:border-violet-300/40 [&>div>div]:from-violet-400 [&>div>div]:to-indigo-300">
            <LoaderOne />
          </div>
          <TextAnimate
            as="span"
            by="character"
            animation="blurIn"
            duration={1.4}
            className="text-xs font-medium text-white/70"
            segmentClassName="whitespace-pre"
          >
            Google sedang mengetik...
          </TextAnimate>
        </div>
      </div>
    </li>
  );
}
