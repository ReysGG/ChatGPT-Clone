"use client";

import { useEffect, useRef } from "react";
import type { Message } from "./types";

interface AutoScrollProps {
  messages: Message[];
  isStreaming: boolean;
}

export function AutoScroll({ messages, isStreaming }: AutoScrollProps): React.ReactElement {
  const markerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    markerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  return <div ref={markerRef} aria-hidden className="h-px" />;
}
