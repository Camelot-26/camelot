import type { ReactNode } from "react";
import { PortalLayout } from "@/components/layout/portal-layout";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <PortalLayout role="admin" title="Admin console">
      {children}
    </PortalLayout>
  );
}
