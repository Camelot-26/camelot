import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { requireAdminPermission } from "@/lib/authorization";
import { getAdminPermissionForPath, hasAdminPermission } from "@/lib/admin-permissions";

export const instant = false;

const adminSections = [
  {
    href: "/admin/users",
    number: "01",
    title: "User directory",
    description: "Browse registered customer and team accounts.",
    status: "Live",
    available: true,
  },
  {
    href: "/admin/bookings",
    number: "02",
    title: "Bookings",
    description: "Reservation management is not connected yet.",
    status: "In development",
    available: false,
  },
  {
    href: "/admin/pages",
    number: "03",
    title: "Website pages",
    description: "Camelot content management is not connected yet.",
    status: "In development",
    available: false,
  },
  {
    href: "/admin/settings",
    number: "04",
    title: "Platform settings",
    description: "Platform configuration is not connected yet.",
    status: "In development",
    available: false,
  },
  {
    href: "/admin/restaurant/categories",
    number: "05",
    title: "Menu categories",
    description: "Organize menu items into restaurant categories.",
    status: "Live",
    available: true,
  },
  {
    href: "/admin/restaurant/menus",
    number: "06",
    title: "Restaurant menus",
    description: "Manage menu items, prices, and availability.",
    status: "Live",
    available: true,
  },
];

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

async function AdminDashboardData({
  adminPermissions,
  canViewUsers,
  isSuperAdmin,
}: {
  adminPermissions: string[];
  canViewUsers: boolean;
  isSuperAdmin: boolean;
}) {
  const prisma = getPrisma();
  const [totalUsers, customers, agents, admins, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "customer" } }),
    prisma.user.count({ where: { role: "agent" } }),
    prisma.user.count({ where: { role: "admin" } }),
    canViewUsers
      ? prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
        })
      : Promise.resolve([]),
  ]);

  const metrics = [
    { label: "Total accounts", value: totalUsers, detail: "All platform users" },
    { label: "Customers", value: customers, detail: "Guest accounts" },
    { label: "Agents", value: agents, detail: "Partner accounts" },
    { label: "Administrators", value: admins, detail: "Management accounts" },
  ];

  return (
    <>
      <section className="admin-dashboard-welcome">
        <div>
          <p className="eyebrow">Admin overview</p>
          <h1>Administrator Dashboard</h1>
          <p>Here’s what’s happening across your Camelot workspace.</p>
        </div>
        {canViewUsers && (
          <Link className="button button-dark admin-dashboard-primary" href="/admin/users">
            Browse user directory <span aria-hidden="true">→</span>
          </Link>
        )}
      </section>

      <section className="admin-metrics" aria-label="Account overview">
        {metrics.map((metric, index) => (
          <article className="admin-metric" key={metric.label}>
            <div className="admin-metric-top">
              <span>{metric.label}</span>
              <span className="admin-metric-index">0{index + 1}</span>
            </div>
            <strong>{metric.value.toLocaleString()}</strong>
            <small>{metric.detail}</small>
          </article>
        ))}
      </section>

      <div className="admin-dashboard-grid">
        {canViewUsers && <section className="admin-dashboard-panel admin-accounts-panel">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">Recently joined</p>
              <h2>Latest accounts</h2>
            </div>
            <Link href="/admin/users">View all <span aria-hidden="true">→</span></Link>
          </div>
          {recentUsers.length > 0 ? (
            <div className="admin-recent-users">
              {recentUsers.map((user) => (
                <article className="admin-user-row" key={user.id}>
                  <span className="admin-user-avatar" aria-hidden="true">
                    {initials(user.name) || "C"}
                  </span>
                  <div className="admin-user-identity">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <span className={`admin-role-badge admin-role-${user.role}`}>
                    {user.role}
                  </span>
                  <time dateTime={user.createdAt.toISOString()}>
                    {user.createdAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              <span className="admin-empty-mark" aria-hidden="true">＋</span>
              <h3>No accounts yet</h3>
              <p>New customer and team accounts will appear here.</p>
            </div>
          )}
        </section>}

        <aside className="admin-dashboard-panel admin-tools-panel">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">Workspace</p>
              <h2>Workspace tools</h2>
            </div>
          </div>
          <div className="admin-tools-list">
            {adminSections
              .filter((section) => {
                const permission = getAdminPermissionForPath(section.href);
                return (
                  !permission ||
                  hasAdminPermission(adminPermissions, permission, isSuperAdmin)
                );
              })
              .map((section) => (
              <Link
                className={`admin-tool${section.available ? "" : " admin-tool-pending"}`}
                href={section.href}
                key={section.href}
              >
                <span className="admin-tool-number">{section.number}</span>
                <span className="admin-tool-copy">
                  <strong>{section.title}</strong>
                  <small>{section.description}</small>
                </span>
                <span className={`admin-tool-status${section.available ? " is-available" : ""}`}>
                  {section.status}
                </span>
              </Link>
            ))}
          </div>
        </aside>
      </div>

      <footer className="admin-dashboard-footer">
        <span><i aria-hidden="true" /> Account data is live</span>
        <span>Bookings and content tools are being connected.</span>
      </footer>
    </>
  );
}

function DashboardLoading() {
  return (
    <div className="admin-dashboard-loading" role="status">
      Loading your admin overview…
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <section className="admin-dashboard">
      <Suspense fallback={<DashboardLoading />}>
        <AdminDashboardContent />
      </Suspense>
    </section>
  );
}

async function AdminDashboardContent() {
  await connection();
  const actor = await requireAdminPermission("dashboard.view");
  const canViewUsers = hasAdminPermission(
    actor.adminPermissions,
    "users.view",
    actor.isSuperAdmin,
  );
  return (
    <AdminDashboardData
      adminPermissions={actor.adminPermissions}
      canViewUsers={canViewUsers}
      isSuperAdmin={actor.isSuperAdmin}
    />
  );
}
