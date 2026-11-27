import { FeaturePage } from "@/components/layout/feature-page";
import { AdminPermissionBoundary } from "@/components/admin/admin-permission-boundary";

export const instant = false;

export default function AdminPagesPage() {
  return (
    <AdminPermissionBoundary permission="website.view">
      <FeaturePage
        eyebrow="Website content"
        title="Pages"
        description="Create and update the public pages that tell the Camelot story."
        detail="The content management system is not connected yet."
      />
    </AdminPermissionBoundary>
  );
}
