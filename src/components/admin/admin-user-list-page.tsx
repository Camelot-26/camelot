import { Suspense } from "react";
import { connection } from "next/server";
import { AdminUserDirectory } from "@/components/admin/admin-user-directory";
import { getPrisma } from "@/lib/prisma";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { requireAdminPermission } from "@/lib/authorization";

type DirectoryRole = "all" | "customer" | "agent" | "admin";

export function AdminUserListPage({ role }: { role: DirectoryRole }) {
  return (
    <Suspense
      fallback={
        <div className="admin-directory-loading" role="status">
          Checking admin access…
        </div>
      }
    >
      <AdminUserListContent role={role} />
    </Suspense>
  );
}

async function AdminUserListContent({ role }: { role: DirectoryRole }) {
  await connection();
  const actor = await requireAdminPermission("users.view");
  const title =
    role === "customer"
      ? "Customers"
      : role === "agent"
        ? "Agents"
        : role === "admin"
          ? "Back-office Users"
          : "User directory";
  const description =
    role === "customer"
      ? "Create and manage customer accounts."
      : role === "agent"
        ? "Create and manage agent accounts."
        : role === "admin"
          ? "Browse administrator accounts."
          : "Browse Camelot customer and team accounts.";

  return (
    <section className="admin-users-page">
      <header className="admin-users-header">
        <div>
          <p className="eyebrow">People &amp; access</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>
      <Suspense fallback={<div className="admin-directory-loading" role="status">Loading accounts…</div>}>
        <AdminUsersData
          adminPermissions={actor.adminPermissions}
          canManageUsers={hasAdminPermission(
            actor.adminPermissions,
            "users.manage",
            actor.isSuperAdmin,
          )}
          isSuperAdmin={actor.isSuperAdmin}
          role={role}
        />
      </Suspense>
    </section>
  );
}

async function AdminUsersData({
  adminPermissions,
  canManageUsers,
  isSuperAdmin,
  role,
}: {
  adminPermissions: string[];
  canManageUsers: boolean;
  isSuperAdmin: boolean;
  role: DirectoryRole;
}) {
  const prisma = getPrisma();
  const [users, adminRoles] = await Promise.all([
    prisma.user.findMany({
    ...(role === "all" ? {} : { where: { role } }),
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      role: true,
      adminRoleId: true,
      adminRole: { select: { name: true, permissions: true } },
      createdAt: true,
    },
    }),
    canManageUsers
      ? prisma.adminRole.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, permissions: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <section className="admin-users-panel" aria-label="User accounts">
      <AdminUserDirectory
        key={role}
        initialRole={role}
        adminRoles={adminRoles
          .filter(
            (adminRole) =>
              isSuperAdmin ||
              adminRole.permissions.every((permission) =>
                hasAdminPermission(adminPermissions, permission),
              ),
          )
          .map(({ id, name }) => ({ id, name }))}
        canManageUsers={canManageUsers}
        isSuperAdmin={isSuperAdmin}
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          image: user.image,
          role: user.role,
          adminRoleId: user.adminRoleId,
          adminRole: user.adminRole
            ? { name: user.adminRole.name }
            : null,
          canManage:
            isSuperAdmin ||
            user.role !== "admin" ||
            (user.adminRoleId !== null &&
              user.adminRole !== null &&
              user.adminRole.permissions.every((permission) =>
                hasAdminPermission(adminPermissions, permission),
              )),
          createdAt: user.createdAt.toISOString(),
        }))}
      />
    </section>
  );
}
