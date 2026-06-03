"use client";

import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { BorderBeam } from "@/components/ui/border-beam";
import type { AuthSession } from "@/app/_hooks/use-chat-state";
import { useModalAccessibility } from "@/app/_hooks/use-modal-accessibility";

export type AuthMode = "login" | "register";

interface AuthCardProps {
  mode: AuthMode;
  isOpen?: boolean;
  isLoading: boolean;
  error: string | null;
  onClose?: () => void;
  onSubmit: (data: { name?: string; email: string; password: string }) => Promise<AuthSession | void> | void;
}

export function AuthCard({
  mode,
  isOpen = true,
  isLoading,
  error,
  onClose,
  onSubmit,
}: AuthCardProps): React.ReactElement | null {
  const { modalRef, handleBackdropClick } = useModalAccessibility(isOpen, onClose || (() => {}));

  if (!isOpen) return null;

  const isRegister = mode === "register";

  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void onSubmit({
            name: String(form.get("name") || ""),
            email: String(form.get("email") || ""),
            password: String(form.get("password") || ""),
          });
        }}
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#111] p-5 text-white shadow-2xl"
      >
        <BorderBeam
          size={90}
          duration={8}
          borderWidth={1.5}
          colorFrom="#a78bfa"
          colorTo="#f59e0b"
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{isRegister ? "Buat akun" : "Login diperlukan"}</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {isRegister
                ? "Daftar untuk mulai simpan chat pribadi."
                : "App tetap bisa dilihat. Login dulu untuk kirim message."}
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-white/10 hover:text-white"
              aria-label="Close login modal"
            >
              <XMarkIcon className="size-4" />
            </button>
          )}
        </div>

        <div className="mt-5 space-y-4">
          {isRegister && (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-zinc-200">Nama</span>
              <input
                name="name"
                type="text"
                className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-violet-400"
                autoFocus
                required
              />
            </label>
          )}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-200">Email</span>
            <input
              name="email"
              type="email"
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-violet-400"
              autoFocus={!isRegister}
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-200">Password</span>
            <input
              name="password"
              type="password"
              minLength={isRegister ? 6 : 1}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm outline-none focus:border-violet-400"
              required
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-5 w-full rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-60"
        >
          {isLoading ? (isRegister ? "Mendaftar..." : "Login...") : isRegister ? "Daftar" : "Login"}
        </button>

        <p className="mt-4 text-center text-sm text-zinc-400">
          {isRegister ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
          <Link className="text-violet-300 hover:text-violet-200" href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Login" : "Daftar"}
          </Link>
        </p>
      </form>
    </div>
  );
}
