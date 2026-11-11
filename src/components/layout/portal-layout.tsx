import type { ReactNode } from "react";
import { Suspense } from "react";
import {
  AdminPortalFrame,
  AdminThemeProvider,
} from "@/components/layout/admin-theme";
import { ProtectedPortal } from "@/components/layout/protected-portal";
import { PortalNavigation } from "@/components/layout/portal-navigation";
import type { UserRole } from "@/types";

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
        {(user) =>
          role === "admin" ? (
            <AdminThemeProvider>
              <AdminPortalFrame title={title} user={user}>
                {children}
              </AdminPortalFrame>
            </AdminThemeProvider>
          ) : (
            <div className="portal">
              <PortalNavigation role={role} title={title} />
              <main className="portal-main">
                <div className="portal-preview-notice">
                  Signed in · {title} access verified
                </div>
                {children}
              </main>
            </div>
          )
        }
      </ProtectedPortal>
    </Suspense>
  );
}
