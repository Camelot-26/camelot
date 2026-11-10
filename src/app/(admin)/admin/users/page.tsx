import { AdminUserDirectory } from "@/components/admin/admin-user-directory";
import { getPrisma } from "@/lib/prisma";
import { Suspense } from "react";

async function AdminUsersData() {
  const users = await getPrisma().user.findMany({
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
        users={users.map((user) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
        }))}
      />
    </section>
  );
}

function UsersLoading() {
  return (
    <div className="admin-directory-loading" role="status">
      Loading accounts…
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <section className="admin-users-page">
      <header className="admin-users-header">
        <div>
          <p className="eyebrow">People &amp; access</p>
          <h1>User directory</h1>
          <p>Browse Camelot customer and team accounts.</p>
        </div>
      </header>
      <Suspense fallback={<UsersLoading />}>
        <AdminUsersData />
      </Suspense>
    </section>
  );
}
