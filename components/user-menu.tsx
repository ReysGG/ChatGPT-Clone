"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  UserCircleIcon,
  Cog6ToothIcon,
  PowerIcon,
  CommandLineIcon,
  QuestionMarkCircleIcon,
  MoonIcon,
  SunIcon,
  ComputerDesktopIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

type ThemeChoice = "light" | "dark" | "system";

interface UserMenuProps {
  anchorClassName?: string;
  /** Optional: override the default account info shown in the menu header. */
  user?: {
    name: string;
    email?: string;
    initial?: string;
    plan?: "free" | "pro";
  };
  onProfile?: () => void;
  onSettings?: () => void;
  onShortcuts?: () => void;
  onHelp?: () => void;
  onUpgrade?: () => void;
  onLogout?: () => void;
}

const PURPLE_GRAD = "bg-gradient-to-r from-violet-500 to-indigo-500";

/**
 * Lightweight, dependency-free user menu popover.
 * - Renders a trigger button (avatar + name + chevron) and a popover anchored above it.
 * - Uses `position: fixed` with measured trigger rect so the popover never gets clipped
 *   by a parent container's overflow.
 * - Closes on outside-click, Escape, or item click.
 */
export function UserMenu({
  anchorClassName,
  user,
  onProfile,
  onSettings,
  onShortcuts,
  onHelp,
  onUpgrade,
  onLogout,
}: UserMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<ThemeChoice>("dark");
  const [pos, setPos] = React.useState<{ left: number; bottom: number } | null>(
    null
  );
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);

  const account = {
    name: user?.name ?? "Naufal",
    email: user?.email ?? "naufal@example.com",
    initial: (user?.initial ?? user?.name?.[0] ?? "N").toUpperCase(),
    plan: user?.plan ?? "free",
  };

  // Measure trigger and compute popover position (fixed, anchored to bottom-left of trigger)
  React.useEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ left: r.left, bottom: window.innerHeight - r.top + 8 });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  // Close on outside click (check both trigger and popover)
  React.useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className={cn("relative", anchorClassName)}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition",
          "hover:bg-white/[0.06] focus:bg-white/[0.06] focus:outline-none",
          open && "bg-white/[0.06]"
        )}
      >
        <div className="relative shrink-0">
          <div
            className="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold text-white shadow-md shadow-pink-500/20"
            style={{
              background:
                "linear-gradient(135deg, #f43f5e 0%, #ec4899 60%, #a855f7 100%)",
            }}
            aria-hidden
          >
            {account.initial}
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-sidebar"
            aria-label="online"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {account.name}
          </p>
          <p className="truncate text-[11px] text-muted">
            {account.plan === "pro" ? "PRO plan" : "Free plan"}
          </p>
        </div>
        <svg
          className={cn(
            "h-4 w-4 text-muted transition-transform",
            open && "rotate-180"
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Popover — fixed positioning so it never gets clipped by parent overflow */}
      {open && pos && (
        <div
          ref={popoverRef}
          role="menu"
          aria-label="User menu"
          style={{
            position: "fixed",
            left: pos.left,
            bottom: pos.bottom,
            zIndex: 60,
            animation: "userMenuIn 140ms cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
          className={cn(
            "w-72 origin-bottom-left rounded-xl border border-white/[0.08] bg-[#161616] text-white shadow-2xl shadow-black/60",
            "ring-1 ring-black/40 backdrop-blur"
          )}
        >
          <style>{`
            @keyframes userMenuIn {
              from { opacity: 0; transform: translateY(6px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0)   scale(1); }
            }
          `}</style>

          {/* Account header */}
          <div className="flex items-center gap-3 border-b border-white/[0.06] px-3 py-2.5">
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white shadow-md shadow-pink-500/20"
              style={{
                background:
                  "linear-gradient(135deg, #f43f5e 0%, #ec4899 60%, #a855f7 100%)",
              }}
              aria-hidden
            >
              {account.initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {account.name}
              </p>
              <p className="truncate text-[11px] text-muted">{account.email}</p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                account.plan === "pro"
                  ? "bg-violet-500/20 text-violet-300"
                  : "bg-white/[0.06] text-muted"
              )}
            >
              {account.plan === "pro" ? "PRO" : "FREE"}
            </span>
          </div>

          {/* Theme chooser */}
          <div className="px-2 pt-2.5">
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              Theme
            </p>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-white/[0.04] p-1">
              {(
                [
                  { id: "light", label: "Light", icon: SunIcon },
                  { id: "dark", label: "Dark", icon: MoonIcon },
                  { id: "system", label: "System", icon: ComputerDesktopIcon },
                ] as {
                  id: ThemeChoice;
                  label: string;
                  icon: React.ComponentType<{ className?: string }>;
                }[]
              ).map((opt) => {
                const active = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs transition",
                      active
                        ? "bg-white/[0.08] text-white shadow-sm"
                        : "text-muted hover:text-white"
                    )}
                    aria-pressed={active}
                  >
                    <opt.icon className="h-3.5 w-3.5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu items */}
          <div className="mt-1.5 px-2 pb-1.5">
            <MenuItem
              icon={UserCircleIcon}
              label="Profile"
              onClick={() => {
                onProfile?.();
                close();
              }}
            />
            <MenuItem
              icon={Cog6ToothIcon}
              label="Settings"
              shortcut="⌘ ,"
              onClick={() => {
                onSettings?.();
                close();
              }}
            />
            <MenuItem
              icon={CommandLineIcon}
              label="Keyboard shortcuts"
              shortcut="?"
              onClick={() => {
                onShortcuts?.();
                close();
              }}
            />
            <MenuItem
              icon={QuestionMarkCircleIcon}
              label="Help & Support"
              onClick={() => {
                onHelp?.();
                close();
              }}
            />
          </div>

          {/* Sign out (separated) */}
          <div className="border-t border-white/[0.06] px-2 py-1.5">
            <button
              type="button"
              onClick={() => {
                onLogout?.();
                close();
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm",
                "text-rose-400 transition hover:bg-rose-500/10"
              )}
              role="menuitem"
            >
              <PowerIcon className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  shortcut,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-white/90 transition",
        "hover:bg-white/[0.06] focus:bg-white/[0.06] focus:outline-none"
      )}
    >
      <Icon className="h-4 w-4 text-muted" />
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-muted">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}
