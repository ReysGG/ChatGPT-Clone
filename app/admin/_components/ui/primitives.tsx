"use client";

import React from "react";
import { Search, AlertCircle, RefreshCw, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------------------
 * Quiet Luxury admin primitives — all tokenized (no hardcoded dark/neon).
 * Colors come from CSS-var-backed Tailwind tokens so they flip with the theme.
 * Cards: rounded-2xl + 1px border + a single diffused shadow (felt, not seen).
 * -------------------------------------------------------------------------- */

export const CARD_SHADOW = "shadow-[0_4px_20px_rgba(0,0,0,0.03)]";

/* -------------------------------- Card ----------------------------------- */
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card",
        CARD_SHADOW,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ----------------------------- SectionHeading ---------------------------- */
export function SectionHeading({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <h3 className="text-sm font-semibold tracking-wide text-foreground">
        {title}
      </h3>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------- PageHeader ------------------------------ */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        {eyebrow ? (
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            {eyebrow}
          </span>
        ) : null}
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px] sm:leading-9">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* --------------------------------- Button -------------------------------- */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border border-border bg-card text-foreground hover:bg-accent",
  ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
  danger:
    "border border-destructive/30 bg-card text-destructive hover:bg-destructive/10",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export const Button = React.forwardRef<
  HTMLButtonElement,
  {
    variant?: ButtonVariant;
    size?: ButtonSize;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function Button({ variant = "secondary", size = "md", className, children, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
      {...props}
    >
      {children}
    </button>
  );
});

/* ------------------------------ IconButton ------------------------------- */
export function IconButton({
  label,
  tone = "default",
  className,
  children,
  ...props
}: {
  label: string;
  tone?: "default" | "danger" | "warning";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const toneClass =
    tone === "danger"
      ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      : tone === "warning"
      ? "text-muted-foreground hover:text-[#9a6700] hover:bg-[#9a6700]/10"
      : "text-muted-foreground hover:text-foreground hover:bg-accent";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        toneClass,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* -------------------------------- StatCard ------------------------------- */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  delta,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  hint?: string;
  delta?: { value: string; tone?: "up" | "down" | "neutral" };
}) {
  const deltaTone =
    delta?.tone === "down"
      ? "text-destructive"
      : delta?.tone === "neutral"
      ? "text-muted-foreground"
      : "text-[var(--color-fg-success-primary)]";

  return (
    <Card className="flex items-start justify-between p-5">
      <div className="space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        <div className="flex items-center gap-2">
          {delta ? (
            <span className={cn("text-xs font-semibold tabular-nums", deltaTone)}>
              {delta.value}
            </span>
          ) : null}
          {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
        </div>
      </div>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-accent">
        <Icon className="h-5 w-5 text-primary" aria-hidden />
      </span>
    </Card>
  );
}

/* ------------------------------- StatusPill ------------------------------ */
type PillTone = "neutral" | "success" | "danger" | "info" | "warning";

const PILL_TONES: Record<PillTone, string> = {
  neutral: "bg-muted2 text-muted-foreground",
  success:
    "bg-[var(--color-fg-success-primary)]/10 text-[var(--color-fg-success-primary)]",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-primary/10 text-primary",
  warning: "bg-[#9a6700]/10 text-[#9a6700]",
};

export function StatusPill({
  tone = "neutral",
  children,
  dot = false,
  className,
}: {
  tone?: PillTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  const dotColor: Record<PillTone, string> = {
    neutral: "bg-muted-foreground",
    success: "bg-[var(--color-fg-success-primary)]",
    danger: "bg-destructive",
    info: "bg-primary",
    warning: "bg-[#9a6700]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        PILL_TONES[tone],
        className
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dotColor[tone])} aria-hidden /> : null}
      {children}
    </span>
  );
}

/* ------------------------------- SearchInput ----------------------------- */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      />
    </div>
  );
}

/* ------------------------------ Field wrappers --------------------------- */
const FIELD_INPUT =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
    return <input ref={ref} className={cn(FIELD_INPUT, className)} {...props} />;
  }
);

export function NumberInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" className={cn(FIELD_INPUT, "tabular-nums", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD_INPUT, className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
        className
      )}
      {...props}
    />
  );
}

/* --------------------------------- Toggle -------------------------------- */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-40 disabled:pointer-events-none",
        checked ? "bg-primary" : "bg-muted2 border border-border"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-card shadow-sm transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

/** A labelled row that wraps a Toggle with title + description. */
export function SettingRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 py-3",
        disabled && "opacity-50"
      )}
    >
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  );
}

/* ------------------------------- EmptyState ------------------------------ */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-accent">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------- ErrorState ------------------------------ */
export function ErrorState({
  title = "Terjadi kesalahan",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-5 w-5 text-destructive" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mx-auto max-w-sm text-xs text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Coba lagi
        </Button>
      ) : null}
    </div>
  );
}

/* ------------------------------- Skeleton -------------------------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted2", className)} />;
}
