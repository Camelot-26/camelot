import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types";
import { getAuth } from "@/lib/auth";

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
