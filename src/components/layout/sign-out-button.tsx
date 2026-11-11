"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");

  async function signOut() {
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError(
          result.error.message ?? "Could not sign out. Please try again.",
        );
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setError("Could not reach the authentication service. Try again.");
    }
  }

  return (
    <>
      <button
        aria-label={collapsed ? "Sign out" : undefined}
        className={`portal-signout${collapsed ? " is-collapsed" : ""}`}
        onClick={signOut}
        title={collapsed ? "Sign out" : undefined}
        type="button"
      >
        {collapsed && (
          <svg
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
            viewBox="0 0 24 24"
          >
            <path d="M10 17l5-5-5-5m5 5H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
          </svg>
        )}
        <span className={collapsed ? "sr-only" : undefined}>Sign out</span>
      </button>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
