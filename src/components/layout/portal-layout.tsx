import type { ReactNode } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { ProtectedPortal } from "@/components/layout/protected-portal";
import { SignOutButton } from "@/components/layout/sign-out-button";
import type { UserRole } from "@/types";

const navigation: Record<UserRole, { href: string; label: string }[]> = {
  customer: [
    { href: "/customer/dashboard", label: "Overview" },
    { href: "/customer/bookings", label: "Bookings" },
    { href: "/customer/profile", label: "Profile" },
  ],
  agent: [
    { href: "/agent/dashboard", label: "Overview" },
    { href: "/agent/referrals", label: "Referrals" },
    { href: "/agent/enquiries", label: "Enquiries" },
  ],
  admin: [
    { href: "/admin/dashboard", label: "Overview" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/pages", label: "Pages" },
    { href: "/admin/banners", label: "Banners" },
    { href: "/admin/bookings", label: "Bookings" },
    { href: "/admin/settings", label: "Settings" },
  ],
};

export function PortalLayout({
  children,
  role,
  title,
}: {
  children: ReactNode;
  role: UserRole;
  title: string;
}) {
  return (
    <Suspense
      fallback={
        <main className="portal-main">
          <p className="portal-preview-notice">Checking account access…</p>
        </main>
      }
    >
      <ProtectedPortal role={role}>
        <div className="portal">
          <aside className="portal-sidebar">
            <Link className="brand portal-brand" href="/">
              CAMELOT<span>.</span>
            </Link>
            <p className="portal-title">{title}</p>
            <nav aria-label={`${title} navigation`} className="portal-nav">
              {navigation[role].map((item) => (
                <Link href={item.href} key={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <SignOutButton />
            <Link className="portal-back" href="/">
              ← Back to Camelot
            </Link>
          </aside>
          <main className="portal-main">
            <div className="portal-preview-notice">
              Signed in · {title} access verified
            </div>
            {children}
          </main>
        </div>
      </ProtectedPortal>
    </Suspense>
  );
}
