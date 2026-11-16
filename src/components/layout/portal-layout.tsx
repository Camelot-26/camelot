import type { ReactNode } from "react";
import { Suspense } from "react";
import {
  AdminPortalFrame,
  AdminThemeProvider,
} from "@/components/layout/admin-theme";
import { PortalFrame } from "@/components/layout/portal-frame";
import { ProtectedPortal } from "@/components/layout/protected-portal";
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
            <PortalFrame role={role} title={title} user={user}>
              {children}
            </PortalFrame>
          )
        }
      </ProtectedPortal>
    </Suspense>
  );
}
