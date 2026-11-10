import type { ReactNode } from "react";
import { requireUserRole } from "@/lib/authorization";
import type { UserRole } from "@/types";

export async function ProtectedPortal({
  children,
  role,
}: {
  children: ReactNode;
  role: UserRole;
}) {
  await requireUserRole(role);
  return children;
}
