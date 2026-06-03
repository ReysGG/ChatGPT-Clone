"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuthSession } from "./use-chat-state";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return data as T;
}

export function useAuthForm(endpoint: "/api/auth/login" | "/api/auth/register") {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (credentials: Record<string, string>) => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchJson<{ session: AuthSession }>(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const next = searchParams.get("next") || "/";
      window.location.href = next;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, error, handleSubmit };
}
