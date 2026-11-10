"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { UserRole } from "@/types";

const workspaces: { role: UserRole; label: string }[] = [
  { role: "customer", label: "Customer" },
  { role: "agent", label: "Agent" },
  { role: "admin", label: "Admin" },
];

const rolePaths: Record<UserRole, string> = {
  customer: "/customer/dashboard",
  agent: "/agent/dashboard",
  admin: "/admin/dashboard",
};

function isUserRole(role: string): role is UserRole {
  return role === "customer" || role === "agent" || role === "admin";
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const isRegister = mode === "register";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const result = isRegister
        ? await authClient.signUp.email({
            name,
            email,
            password,
            phone: phone.trim() || undefined,
            image: avatar.trim() || undefined,
          })
        : await authClient.signIn.email({
            email,
            password,
            callbackURL: rolePaths[role],
          });

      if (result.error) {
        setError(result.error.message ?? "We couldn’t complete that request.");
        return;
      }

      let destination: string;
      if (isRegister) {
        const registeredRole = result.data.user.role;
        if (!isUserRole(registeredRole)) {
          setError(
            "Your account was created, but its assigned role could not be verified. Please sign in or contact support.",
          );
          return;
        }
        destination = rolePaths[registeredRole];
      } else {
        destination = rolePaths[role];
      }

      router.replace(destination);
      router.refresh();
    } catch {
      setError(
        "We couldn’t reach the authentication service. Check the local setup and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="auth-card">
      <p className="eyebrow">{isRegister ? "Join us" : "Welcome back"}</p>
      <h1>{isRegister ? "Make yourself at home." : "Sign in to Camelot."}</h1>
      <p className="auth-intro">
        {isRegister
          ? "Create an account to keep your bookings and details together. The first account is the administrator; later accounts are customers."
          : "Use the account assigned to your Camelot workspace."}
      </p>

      {!isRegister && (
        <div className="workspace-list" aria-label="Choose a workspace">
          {workspaces.map((workspace) => (
            <button
              aria-pressed={role === workspace.role}
              className="workspace-option"
              key={workspace.role}
              onClick={() => setRole(workspace.role)}
              type="button"
            >
              <strong>{workspace.label}</strong>
            </button>
          ))}
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        {isRegister && (
          <label>
            Name
            <input
              autoComplete="name"
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </label>
        )}
        {isRegister && (
          <label>
            Phone (optional)
            <input
              autoComplete="tel"
              onChange={(event) => setPhone(event.target.value)}
              type="tel"
              value={phone}
            />
          </label>
        )}
        {isRegister && (
          <label>
            Avatar URL (optional)
            <input
              autoComplete="url"
              onChange={(event) => setAvatar(event.target.value)}
              type="url"
              value={avatar}
            />
          </label>
        )}
        <label>
          Email
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label>
          Password
          <input
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button className="button button-dark auth-submit" disabled={pending}>
          {pending
            ? "Please wait…"
            : isRegister
              ? "Create account"
              : "Sign in"}
        </button>
      </form>

      {!isRegister && (
        <p className="auth-notice">
          Workspace choice only selects where to go after sign-in. Access is
          determined by the role assigned to your account.
        </p>
      )}
      <p className="auth-switch">
        {isRegister ? "Already have an account?" : "New to Camelot?"}{" "}
        <Link href={isRegister ? "/login" : "/register"}>
          {isRegister ? "Sign in" : "Create a customer account"}
        </Link>
      </p>
    </section>
  );
}
