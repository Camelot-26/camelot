import type { ReactNode } from "react";
import Link from "next/link";

export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="admin-auth-page">
      <header className="admin-auth-header">
        <Link className="admin-auth-brand" href="/" aria-label="Camelot home">
          CAMELOT<span>.</span>
        </Link>
        <Link className="admin-auth-back" href="/login">
          Guest &amp; agent sign in <span aria-hidden="true">↗</span>
        </Link>
      </header>
      <div className="admin-auth-content">{children}</div>
      <footer className="admin-auth-footer">
        <span className="admin-auth-indicator" aria-hidden="true" />
        SECURE ADMINISTRATOR ACCESS
      </footer>
    </main>
  );
}
