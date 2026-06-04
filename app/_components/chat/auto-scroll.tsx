"use client";

import { useEffect, useRef } from "react";
import type { Message } from "./types";

interface AutoScrollProps {
  messages: Message[];
  isStreaming: boolean;
}

/**
 * Renders an invisible sentinel element at the bottom of the message list.
 * Scrolls into view only when the user is already near the bottom
 * (within THRESHOLD px) — this prevents hijacking scroll position when
 * the user is reading older messages while a new response streams in.
 */
const THRESHOLD = 150; // px from bottom considered "at bottom"

export function AutoScroll({ messages, isStreaming }: AutoScrollProps): React.ReactElement {
  const markerRef = useRef<HTMLDivElement | null>(null);
  // Track whether user was at bottom before the last update
  const isAtBottomRef = useRef<boolean>(true);

  // Listen to scroll events on the nearest scrollable ancestor
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const scrollParent = getScrollParent(marker);
    if (!scrollParent) return;

    function handleScroll() {
      if (!scrollParent) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollParent as HTMLElement & Document;
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight <= THRESHOLD;
    }

    scrollParent.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollParent.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll when messages change, but only if user is near bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      markerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isStreaming]);

  return <div ref={markerRef} aria-hidden className="h-px" />;
}

function getScrollParent(node: HTMLElement | null): HTMLElement | Window | null {
  if (!node) return window;
  const overflowY = window.getComputedStyle(node).overflowY;
  const isScrollable = overflowY === "auto" || overflowY === "scroll";
  if (isScrollable && node.scrollHeight > node.clientHeight) return node;
  return getScrollParent(node.parentElement);
}
