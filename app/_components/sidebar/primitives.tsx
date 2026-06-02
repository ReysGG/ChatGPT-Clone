import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children, ...rest }: CardProps) {
  return (
    <div className={cn("rounded-xl", className)} {...rest}>
      {children}
    </div>
  );
}

type TypographyVariant = "h5" | "h6" | "small" | "paragraph";

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TypographyVariant;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  children: React.ReactNode;
}

export function Typography({
  variant = "paragraph",
  as,
  className,
  children,
  ...rest
}: TypographyProps) {
  const Tag = (as ?? (variant === "h5" || variant === "h6" ? variant : "p")) as
    | keyof React.JSX.IntrinsicElements;
  const sizeClass =
    variant === "h5"
      ? "text-xl font-semibold leading-snug"
      : variant === "h6"
        ? "text-base font-semibold leading-snug"
        : variant === "small"
          ? "text-sm leading-normal"
          : "text-base leading-normal";
  return React.createElement(
    Tag,
    { className: cn(sizeClass, "antialiased", className), ...rest },
    children
  );
}

interface ListProps extends React.HTMLAttributes<HTMLUListElement> {
  className?: string;
  children: React.ReactNode;
}

export function List({ className, children, ...rest }: ListProps) {
  return (
    <ul className={cn("flex min-w-0 flex-col gap-1", className)} {...rest}>
      {children}
    </ul>
  );
}

interface ListItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  asDiv?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function ListItem({
  selected,
  asDiv,
  className,
  children,
  ...rest
}: ListItemProps) {
  const base =
    "flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition outline-none select-none";
  const state = selected
    ? "bg-violet-500/15 ring-1 ring-violet-500/30 text-white"
    : "text-white/85 hover:bg-white/[0.04] focus:bg-white/[0.04]";
  const cls = cn(base, state, className);

  if (asDiv) {
    return (
      <div
        className={cls}
        {...(rest as React.HTMLAttributes<HTMLDivElement>)}
      >
        {children}
      </div>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

interface ListSlotProps {
  className?: string;
  children: React.ReactNode;
}

export function ListItemPrefix({ className, children }: ListSlotProps) {
  return (
    <span className={cn("grid place-items-center", className)}>{children}</span>
  );
}

export function ListItemSuffix({ className, children }: ListSlotProps) {
  return <span className={cn("ml-auto", className)}>{children}</span>;
}
