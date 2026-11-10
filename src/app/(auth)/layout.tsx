import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link className="auth-brand" href="/" aria-label="Camelot home">
          CAMELOT<span>.</span>
        </Link>
        <div className="auth-story-copy">
          <p className="auth-story-eyebrow">Dining · Live performance · Riverside</p>
          <h1>
            One destination.
            <br />
            <em>An entire night.</em>
          </h1>
          <p>
            Step inside a world of memorable evenings, remarkable food, and
            stories worth sharing.
          </p>
        </div>
        <p className="auth-story-note">A new kind of night is taking shape.</p>
      </section>
      <section className="auth-panel" aria-label="Account access">
        <div className="auth-panel-top">
          <span>THE CAMELOT EXPERIENCE</span>
          <Link href="/">Back to home <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="auth-content">{children}</div>
        <p className="auth-footer">A place to stay, gather, and feel at home.</p>
      </section>
    </main>
  );
}
