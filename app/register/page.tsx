"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "../_components/auth-card";
import type { AuthSession } from "../_hooks/use-chat-state";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data as T;
}

function RegisterForm(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <AuthCard
      mode="register"
      isLoading={isLoading}
      error={error}
      onSubmit={async ({ name, email, password }) => {
        setIsLoading(true);
        setError(null);
        try {
          await fetchJson<{ session: AuthSession }>("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
          });
          const next = searchParams.get("next") || "/";
          window.location.href = next;
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setIsLoading(false);
        }
      }}
    />
  );
}

export default function RegisterPage(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
