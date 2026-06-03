"use client";

import { AuthCard } from "@/components/auth-card";
import { useModalAccessibility } from "../_hooks/use-modal-accessibility";
import type { AuthSession } from "../_hooks/use-chat-state";

interface LoginModalProps {
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onLogin: (data: { email: string; password: string }) => Promise<AuthSession | void> | void;
}

export function LoginModal({ isOpen, isLoading, error, onClose, onLogin }: LoginModalProps): React.ReactElement | null {
  return (
    <AuthCard
      mode="login"
      isOpen={isOpen}
      isLoading={isLoading}
      error={error}
      onClose={onClose}
      onSubmit={({ email, password }) => onLogin({ email, password })}
    />
  );
}
