import type { ReactNode } from "react";
import { Suspense } from "react";
import { connection } from "next/server";
import { requireAdminPermission } from "@/lib/authorization";
import type { AdminPermission } from "@/lib/admin-permissions";

export function AdminPermissionBoundary({
  children,
  permission,
}: {
  children: ReactNode;
  permission: AdminPermission;
}) {
  return (
    <Suspense
      fallback={
        <div className="admin-directory-loading" role="status">
          Checking admin access…
        </div>
      }
    >
      <AuthorizedAdminContent permission={permission}>
        {children}
      </AuthorizedAdminContent>
    </Suspense>
  );
}

async function AuthorizedAdminContent({
  children,
  permission,
}: {
  children: ReactNode;
  permission: AdminPermission;
}) {
  await connection();
  await requireAdminPermission(permission);
  return children;
}
