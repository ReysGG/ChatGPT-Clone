"use client";

import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { useAuthForm } from "../_hooks/use-auth-form";

function LoginForm(): React.ReactElement {
  const { isLoading, error, handleSubmit } = useAuthForm("/api/auth/login");

  return (
    <AuthCard
      mode="login"
      isLoading={isLoading}
      error={error}
      onSubmit={handleSubmit}
    />
  );
}

export default function LoginClient(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
