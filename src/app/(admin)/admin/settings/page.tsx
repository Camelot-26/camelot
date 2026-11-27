import { AdminThemeSettings } from "@/components/layout/admin-theme";
import { AdminPermissionBoundary } from "@/components/admin/admin-permission-boundary";

export const instant = false;

export default function AdminSettingsPage() {
  return (
    <AdminPermissionBoundary permission="settings.view">
      <AdminThemeSettings />
    </AdminPermissionBoundary>
  );
}
