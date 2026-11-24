import { Suspense } from "react";
import { AdminUserDirectory } from "@/components/admin/admin-user-directory";
import { getPrisma } from "@/lib/prisma";

type DirectoryRole = "all" | "customer" | "agent" | "admin";

export function AdminUserListPage({ role }: { role: DirectoryRole }) {
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
        <AdminUsersData role={role} />
      </Suspense>
    </section>
  );
}

async function AdminUsersData({ role }: { role: DirectoryRole }) {
  const users = await getPrisma().user.findMany({
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
      createdAt: true,
    },
  });

  return (
    <section className="admin-users-panel" aria-label="User accounts">
      <AdminUserDirectory
        key={role}
        initialRole={role}
        users={users.map((user) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
        }))}
      />
    </section>
  );
}
