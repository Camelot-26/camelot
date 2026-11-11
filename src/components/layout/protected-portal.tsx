import type { ReactNode } from "react";
import { requireUserRole } from "@/lib/authorization";
import type { UserRole } from "@/types";

export async function ProtectedPortal({
  children,
  role,
}: {
  children: (user: { name: string; image: string | null }) => ReactNode;
  role: UserRole;
}) {
  const user = await requireUserRole(role);
  return children(user);
}
