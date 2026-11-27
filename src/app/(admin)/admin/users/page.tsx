import { AdminUserListPage } from "@/components/admin/admin-user-list-page";

export const instant = false;

export default function AdminUsersPage() {
  return <AdminUserListPage role="all" />;
}
