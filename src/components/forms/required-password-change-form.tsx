"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completePasswordChange } from "@/app/(auth)/change-password/actions";

export function RequiredPasswordChangeForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirmation) {
      setError("The new passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const result = await completePasswordChange(currentPassword, newPassword);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.replace(result.destination);
      router.refresh();
    } catch {
      setError("We couldn’t update your password. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-card required-password-card">
      <p className="eyebrow">Account security</p>
      <h1>Choose a new password.</h1>
      <p className="auth-intro">
        Your administrator issued a temporary password. Replace it with a
        password only you know to continue.
      </p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Temporary password
          <input
            autoComplete="current-password"
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            type="password"
            value={currentPassword}
          />
        </label>
        <label>
          New password
          <input
            autoComplete="new-password"
            minLength={8}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            type="password"
            value={newPassword}
          />
        </label>
        <label>
          Confirm new password
          <input
            autoComplete="new-password"
            minLength={8}
            onChange={(event) => setConfirmation(event.target.value)}
            required
            type="password"
            value={confirmation}
          />
        </label>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button className="button button-dark auth-submit" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
