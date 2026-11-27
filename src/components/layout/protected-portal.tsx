import type { ReactNode } from "react";
import { connection } from "next/server";
import { requireUserRole } from "@/lib/authorization";
import type { UserRole } from "@/types";

export async function ProtectedPortal({
  children,
  role,
}: {
  children: (user: {
    name: string;
    image: string | null;
    adminPermissions: string[];
    isSuperAdmin: boolean;
    adminRoleId: string | null;
  }) => ReactNode;
  role: UserRole;
}) {
  await connection();
  const user = await requireUserRole(role);
  return children(user);
}
