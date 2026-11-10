import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-page">
      <Link className="auth-brand" href="/" aria-label="Camelot home">
        CAMELOT<span>.</span>
      </Link>
      <div className="auth-content">{children}</div>
      <p className="auth-footer">A place to stay, gather, and feel at home.</p>
    </main>
  );
}
