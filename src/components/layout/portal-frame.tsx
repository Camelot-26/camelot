"use client";

import { useState, type ReactNode } from "react";
import { PortalNavigation } from "@/components/layout/portal-navigation";
import type { UserRole } from "@/types";

export function PortalFrame({
  children,
  role,
  title,
  user,
}: {
  children: ReactNode;
  role: UserRole;
  title: string;
  user: { name: string; image: string | null };
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      className={`portal${sidebarCollapsed ? " portal-sidebar-collapsed" : ""}`}
    >
      <PortalNavigation
        isSidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((collapsed) => !collapsed)}
        role={role}
        title={title}
        user={user}
      />
      <main className="portal-main">
        <div className="portal-preview-notice">
          Signed in · {title} access verified
        </div>
        {children}
      </main>
    </div>
  );
}
