import { FeaturePage } from "@/components/layout/feature-page";
import { AdminPermissionBoundary } from "@/components/admin/admin-permission-boundary";

export const instant = false;

export default function AdminBannersPage() {
  return (
    <AdminPermissionBoundary permission="website.view">
      <FeaturePage
        eyebrow="Website content"
        title="Banners"
        description="Manage the featured messages and imagery across the website."
        detail="Banner management is not connected yet."
      />
    </AdminPermissionBoundary>
  );
}
