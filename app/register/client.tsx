"use client";

import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { useAuthForm } from "../_hooks/use-auth-form";

function RegisterForm(): React.ReactElement {
  const { isLoading, error, handleSubmit } = useAuthForm("/api/auth/register");

  return (
    <AuthCard
      mode="register"
      isLoading={isLoading}
      error={error}
      onSubmit={handleSubmit}
    />
  );
}

export default function RegisterClient(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
