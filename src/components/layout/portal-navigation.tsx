"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { SignOutButton } from "@/components/layout/sign-out-button";
import type { UserRole } from "@/types";

type NavigationItem = {
  href: string;
  label: string;
};

type AdminNavigationItem = {
  href?: string;
  icon: AdminNavigationIcon;
  label: string;
};

type AdminNavigationSection = {
  id: string;
  icon: AdminNavigationIcon;
  label: string;
  items: AdminNavigationItem[];
};

type AdminNavigationIcon =
  | "dashboard"
  | "booking"
  | "mail"
  | "calendar"
  | "users"
  | "user"
  | "referral"
  | "restaurant"
  | "category"
  | "performance"
  | "page"
  | "image"
  | "folder"
  | "shield"
  | "key"
  | "chart"
  | "settings"
  | "bell";

const adminNavigationIconPaths: Record<AdminNavigationIcon, string> = {
  dashboard: "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
  booking: "M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM8 2v4m8-4v4M3 10h18",
  mail: "M3 5h18v14H3zM3 6l9 7 9-7",
  calendar: "M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM8 2v4m8-4v4M3 10h18m5 5h.01M12 15h.01M16 19h.01",
  users: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6-7a4 4 0 0 1 0 8m2 3a4 4 0 0 1 3 4v2",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  referral: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm9-5v6m-3-3h6",
  restaurant: "M7 2v8m4-8v8M7 6h4m-2 4v12m9-20v20m0-20a5 5 0 0 1 5 5v4h-5",
  category: "M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5",
  performance: "M3 18V6m6 12V3m6 15V9m6 9V5",
  page: "M6 2h9l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1v5h5m-9 5h5m-5 4h8",
  image: "M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4m-9-8h.01",
  folder: "M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v11H3z",
  shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-11 2 2 4-4",
  key: "M21 2l-2 2m-7.5 7.5a5 5 0 1 1-7.07 7.07 5 5 0 0 1 7.07-7.07Zm0 0L17 4l3 3-2 2 2 2-3 3",
  chart: "M3 3v18h18M8 16v-4m5 4V6m5 10v-7",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3m10-10h-3M5 12H2m17.07-7.07-2.12 2.12M7.05 16.95l-2.12 2.12m14.14 0-2.12-2.12M7.05 7.05 4.93 4.93",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4",
};

function AdminNavigationIconView({ icon }: { icon: AdminNavigationIcon }) {
  return (
    <svg
      aria-hidden="true"
      className="portal-nav-icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
    >
      <path d={adminNavigationIconPaths[icon]} />
    </svg>
  );
}

const navigation: Record<Exclude<UserRole, "admin">, NavigationItem[]> = {
  customer: [
    { href: "/customer/dashboard", label: "Overview" },
    { href: "/customer/bookings", label: "Bookings" },
    { href: "/customer/profile", label: "Profile" },
  ],
  agent: [
    { href: "/agent/dashboard", label: "Overview" },
    { href: "/agent/referrals", label: "Referrals" },
    { href: "/agent/enquiries", label: "Enquiries" },
  ],
};

const adminNavigation: AdminNavigationSection[] = [
  {
    id: "overview",
    icon: "dashboard",
    label: "Overview",
    items: [{ href: "/admin/dashboard", icon: "dashboard", label: "Dashboard" }],
  },
  {
    id: "operations",
    icon: "booking",
    label: "Operations",
    items: [
      { href: "/admin/bookings", icon: "booking", label: "Bookings" },
      { icon: "mail", label: "Enquiries" },
      { icon: "calendar", label: "Events" },
    ],
  },
  {
    id: "users",
    icon: "users",
    label: "Users",
    items: [
      { href: "/admin/users", icon: "user", label: "Users" },
      // { label: "Agents" },
      // { label: "Referrals" },
    ],
  },
  {
    id: "restaurant",
    icon: "restaurant",
    label: "Restaurant",
    items: [
      { icon: "restaurant", label: "Menus" },
      { icon: "category", label: "Categories" },
      { icon: "performance", label: "Performances" },
    ],
  },
  {
    id: "website",
    icon: "page",
    label: "Website",
    items: [
      { href: "/admin/pages", icon: "page", label: "Pages" },
      { href: "/admin/banners", icon: "image", label: "Banners" },
      { icon: "folder", label: "Media" },
    ],
  },
  {
    id: "management",
    icon: "shield",
    label: "Management",
    items: [
      { href: "/admin/users", icon: "users", label: "Users" },
      { icon: "shield", label: "Roles" },
      { icon: "key", label: "Permissions" },
    ],
  },
  {
    id: "reports",
    icon: "chart",
    label: "Reports",
    items: [
      { icon: "chart", label: "Booking Reports" },
      { icon: "chart", label: "Agent Reports" },
    ],
  },
  {
    id: "settings",
    icon: "settings",
    label: "Settings",
    items: [
      { href: "/admin/settings", icon: "settings", label: "General Settings" },
      { icon: "bell", label: "Notifications" },
    ],
  },
];

export function PortalNavigation({
  isSidebarCollapsed = false,
  onToggleSidebar,
  role,
  title,
  user,
}: {
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  role: UserRole;
  title: string;
  user?: { name: string; image: string | null };
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "overview",
  );

  return (
    <aside
      className={`portal-sidebar${isSidebarCollapsed ? " is-collapsed" : ""}`}
    >
      <div className="portal-sidebar-header">
        <Link
          aria-label="Camelot home"
          className="brand portal-brand"
          href="/"
          title={isSidebarCollapsed ? "Camelot home" : undefined}
        >
          <span className="portal-brand-full">
            CAMELOT<span>.</span>
          </span>
          <span aria-hidden="true" className="portal-brand-mark">
            C
          </span>
        </Link>
        {role === "admin" && (
          <button
            aria-controls="portal-navigation"
            aria-expanded={!isSidebarCollapsed}
            aria-label={
              isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            className="portal-sidebar-collapse-toggle"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            type="button"
          >
            <span aria-hidden="true">
              {isSidebarCollapsed ? "›" : "‹"}
            </span>
          </button>
        )}
        <button
          aria-controls="portal-navigation"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          className="portal-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          <span />
          <span />
          <span className="sr-only">
            {menuOpen ? "Close navigation" : "Open navigation"}
          </span>
        </button>
      </div>
      {role === "admin" && user && (
        <div
          className="portal-sidebar-profile"
          title={isSidebarCollapsed ? user.name : undefined}
        >
          {user.image ? (
            <Image
              alt=""
              className="portal-sidebar-avatar"
              height={40}
              src={user.image}
              unoptimized
              width={40}
            />
          ) : (
            <span aria-hidden="true" className="portal-sidebar-avatar-fallback">
              {user.name.trim().slice(0, 1).toUpperCase() || "U"}
            </span>
          )}
          <span className="portal-sidebar-profile-name">{user.name}</span>
        </div>
      )}
      <div
        className={`portal-sidebar-content${menuOpen ? " is-open" : ""}`}
        id="portal-navigation"
      >
        <p className="portal-title">{title}</p>
        <nav
          aria-label={`${title} navigation`}
          className={`portal-nav${role === "admin" ? " portal-nav-grouped" : ""}`}
        >
          {role === "admin"
            ? adminNavigation.map((section) => {
                const expanded = expandedSection === section.id;
                const panelId = `admin-navigation-${section.id}`;

                return (
                  <section className="portal-nav-section" key={section.id}>
                    <button
                      aria-controls={panelId}
                      aria-expanded={expanded}
                      aria-label={section.label}
                      className="portal-nav-section-toggle"
                      onClick={() =>
                        setExpandedSection((current) =>
                          current === section.id ? null : section.id,
                        )
                      }
                      type="button"
                    >
                      <span className="portal-nav-section-label">
                        <AdminNavigationIconView icon={section.icon} />
                        {section.label}
                      </span>
                      <span
                        aria-hidden="true"
                        className="portal-nav-chevron"
                      />
                    </button>
                    <div
                      className="portal-nav-section-items"
                      hidden={!expanded}
                      id={panelId}
                    >
                      {section.items.map((item) =>
                        item.href ? (
                          <Link
                            aria-label={
                              isSidebarCollapsed ? item.label : undefined
                            }
                            href={item.href}
                            key={item.label}
                            onClick={() => setMenuOpen(false)}
                            title={isSidebarCollapsed ? item.label : undefined}
                          >
                            <AdminNavigationIconView icon={item.icon} />
                            <span className="portal-nav-item-label">
                              {item.label}
                            </span>
                          </Link>
                        ) : (
                          <span
                            aria-disabled="true"
                            aria-label={
                              isSidebarCollapsed
                                ? `${item.label}, coming soon`
                                : undefined
                            }
                            className="portal-nav-disabled"
                            key={item.label}
                            title={isSidebarCollapsed ? item.label : undefined}
                          >
                            <span className="portal-nav-disabled-label">
                              <AdminNavigationIconView icon={item.icon} />
                              <span className="portal-nav-item-label">
                                {item.label}
                              </span>
                            </span>
                            {!isSidebarCollapsed && <small>Coming soon</small>}
                          </span>
                        ),
                      )}
                    </div>
                  </section>
                );
              })
            : navigation[role].map((item) => (
                <Link
                  href={item.href}
                  key={item.href}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
        </nav>
        <SignOutButton
          collapsed={role === "admin" && isSidebarCollapsed}
        />
        <Link
            aria-label="Back to Camelot"
            className="portal-back"
            href="/"
            onClick={() => setMenuOpen(false)}
            title={isSidebarCollapsed ? "Back to Camelot" : undefined}
          >
            <span aria-hidden="true">←</span>
            <span className="portal-nav-item-label">Back to Camelot</span>
          </Link>
      </div>
    </aside>
  );
}
