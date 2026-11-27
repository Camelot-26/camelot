import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types";
import { getAuth } from "@/lib/auth";
import {
  hasAdminPermission,
  type AdminPermission,
} from "@/lib/admin-permissions";
import { getPrisma } from "@/lib/prisma";

const rolePaths: Record<UserRole, string> = {
  customer: "/customer/dashboard",
  agent: "/agent/dashboard",
  admin: "/admin/dashboard",
};

function isUserRole(role: string): role is UserRole {
  return role === "customer" || role === "agent" || role === "admin";
}

export async function requireUserRole(expectedRole: UserRole) {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  if (!session) {
    if (expectedRole === "admin") {
      redirect("/admin/login");
    }
    redirect(`/login?role=${expectedRole}`);
  }

  const role = session.user.role;
  if (!isUserRole(role)) {
    redirect("/login");
  }

  if (role !== expectedRole) {
    redirect(rolePaths[role]);
  }

  if (session.user.passwordChangeRequired) {
    redirect("/change-password");
  }

  let adminPermissions: string[] = [];
  let isSuperAdmin = false;
  let adminRoleId: string | null = null;
  if (role === "admin") {
    const account = await getPrisma().user.findUnique({
      where: { id: session.user.id },
      select: {
        adminRoleId: true,
        adminRole: { select: { permissions: true } },
      },
    });
    isSuperAdmin = account !== null && account.adminRoleId === null;
    adminRoleId = account?.adminRoleId ?? null;
    adminPermissions = account?.adminRole?.permissions ?? [];
  }

  return {
    name: session.user.name,
    image: session.user.image ?? null,
    adminPermissions,
    isSuperAdmin,
    adminRoleId,
  };
}

export async function requireAdminPermission(permission: AdminPermission) {
  const user = await requireUserRole("admin");
  if (!hasAdminPermission(user.adminPermissions, permission, user.isSuperAdmin)) {
    redirect("/admin/unauthorized");
  }
  return user;
}

export async function requirePasswordChange() {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const role = session.user.role;
  if (!isUserRole(role)) {
    redirect("/login");
  }
  if (!session.user.passwordChangeRequired) {
    redirect(rolePaths[role]);
  }
}
