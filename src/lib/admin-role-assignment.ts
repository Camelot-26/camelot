import "server-only";

import { hasAdminPermission } from "@/lib/admin-permissions";
import type { requireAdminPermission } from "@/lib/authorization";
import { getPrisma } from "@/lib/prisma";

type AdminActor = Awaited<ReturnType<typeof requireAdminPermission>>;

export async function canAssignAdminRole(
  actor: AdminActor,
  roleId: string | null,
) {
  if (!roleId) return actor.isSuperAdmin;

  const role = await getPrisma().adminRole.findUnique({
    where: { id: roleId },
    select: { permissions: true },
  });
  if (!role) return false;
  if (actor.isSuperAdmin) return true;

  return role.permissions.every((permission) =>
    hasAdminPermission(actor.adminPermissions, permission),
  );
}
