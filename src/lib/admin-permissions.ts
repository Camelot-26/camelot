export const adminPermissionSections = [
  { key: "dashboard", label: "Dashboard", canManage: false },
  { key: "bookings", label: "Bookings", canManage: true },
  { key: "enquiries", label: "Enquiries", canManage: true },
  { key: "events", label: "Events", canManage: true },
  { key: "users", label: "Users & back-office accounts", canManage: true },
  { key: "restaurant", label: "Restaurant", canManage: true },
  { key: "website", label: "Website content", canManage: true },
  { key: "settings", label: "Settings", canManage: true },
  { key: "roles", label: "Roles & permissions", canManage: true },
] as const;

export type AdminPermissionSection =
  (typeof adminPermissionSections)[number]["key"];

export type AdminPermission =
  | `${AdminPermissionSection}.view`
  | `${Exclude<AdminPermissionSection, "dashboard">}.manage`;

export const adminPermissions = adminPermissionSections.flatMap((section) =>
  section.canManage
    ? [`${section.key}.view`, `${section.key}.manage`]
    : [`${section.key}.view`],
) as AdminPermission[];

export function isAdminPermission(value: unknown): value is AdminPermission {
  return typeof value === "string" && adminPermissions.includes(value as AdminPermission);
}

export function normalizeAdminPermissions(value: unknown): AdminPermission[] {
  if (!Array.isArray(value)) return [];

  const permissions = new Set(value.filter(isAdminPermission));
  permissions.add("dashboard.view");
  for (const section of adminPermissionSections) {
    if (section.canManage && permissions.has(`${section.key}.manage` as AdminPermission)) {
      permissions.add(`${section.key}.view` as AdminPermission);
    }
  }
  return [...permissions];
}

export function hasAdminPermission(
  permissions: readonly string[],
  permission: string,
  isSuperAdmin = false,
) {
  if (isSuperAdmin) return true;
  if (permissions.includes(permission)) return true;

  if (permission.endsWith(".view")) {
    const managePermission = `${permission.slice(0, -".view".length)}.manage`;
    return permissions.includes(managePermission);
  }
  return false;
}

export function getAdminPermissionForPath(path: string): AdminPermission | null {
  if (path === "/admin/dashboard") return "dashboard.view";
  if (path.startsWith("/admin/bookings")) return "bookings.view";
  if (path.startsWith("/admin/enquiries")) return "enquiries.view";
  if (
    path.startsWith("/admin/events") ||
    path.startsWith("/admin/event-categories")
  ) {
    return "events.view";
  }
  if (
    path.startsWith("/admin/users") ||
    path.startsWith("/admin/customers") ||
    path.startsWith("/admin/agents") ||
    path.startsWith("/admin/admin-users")
  ) {
    return "users.view";
  }
  if (path.startsWith("/admin/restaurant")) return "restaurant.view";
  if (path.startsWith("/admin/pages") || path.startsWith("/admin/banners")) {
    return "website.view";
  }
  if (path.startsWith("/admin/settings")) return "settings.view";
  if (path.startsWith("/admin/roles") || path.startsWith("/admin/permissions")) {
    return "roles.view";
  }
  return null;
}
