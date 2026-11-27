import { Suspense } from "react";
import { connection } from "next/server";
import { AdminRoleManagement } from "@/components/admin/admin-role-management";
import { requireAdminPermission } from "@/lib/authorization";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { getPrisma } from "@/lib/prisma";

export function AdminRoleManagementPage({
  title,
}: {
  title: "Roles" | "Permissions";
}) {
  return (
    <Suspense
      fallback={
        <div className="admin-directory-loading" role="status">
          Checking admin access…
        </div>
      }
    >
      <AdminRoleManagementContent title={title} />
    </Suspense>
  );
}

async function AdminRoleManagementContent({
  title,
}: {
  title: "Roles" | "Permissions";
}) {
  await connection();
  const actor = await requireAdminPermission("roles.view");
  const roles = await getPrisma().adminRole.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return (
    <AdminRoleManagement
      roles={roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        userCount: role._count.users,
      }))}
      canManageRoles={hasAdminPermission(
        actor.adminPermissions,
        "roles.manage",
        actor.isSuperAdmin,
      )}
      lockedRoleId={actor.isSuperAdmin ? null : actor.adminRoleId}
      title={title}
    />
  );
}
