"use client";

import { ImageIcon, PencilLineIcon, SearchIcon } from "lucide-react";
import { MorphingText } from "@/components/ui/morphing-text";

const PROMPTS = [
  "What's on the agenda today?",
  "Mau ngobrolin apa hari ini?",
  "Ada ide yang mau kita mulai?",
  "Apa yang ingin kamu buat?",
  "Butuh bantuan nulis apa?",
  "Mulai dari satu pertanyaan.",
];

export const EMPTY_CHAT_ACTIONS = [
  { label: "Create an image", icon: ImageIcon },
  { label: "Write or edit", icon: PencilLineIcon },
  { label: "Look something up", icon: SearchIcon },
];

interface EmptyStateProps {
  promptSeed: number;
}

export function EmptyState({ promptSeed }: EmptyStateProps): React.ReactElement {
  const texts = PROMPTS.map((_, index) => PROMPTS[(promptSeed + index) % PROMPTS.length]);

  return (
    <div className="grid h-full place-items-center px-4 text-center">
      <div className="w-full max-w-4xl -translate-y-20">
        <MorphingText
          key={promptSeed}
          texts={texts}
          className="h-10 text-[20px] font-semibold leading-tight text-foreground md:h-14 md:text-[28px] lg:text-[34px]"
        />
      </div>
    </div>
  );
}
