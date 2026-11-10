import type { ReactNode } from "react";
import { PortalLayout } from "@/components/layout/portal-layout";

export default function AgentLayout({ children }: { children: ReactNode }) {
  return (
    <PortalLayout role="agent" title="Agent workspace">
      {children}
    </PortalLayout>
  );
}
