import type { ReactNode } from "react";
import { PortalLayout } from "@/components/layout/portal-layout";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <PortalLayout role="customer" title="Customer space">
      {children}
    </PortalLayout>
  );
}
