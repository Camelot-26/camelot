"use client";

import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { PortalNavigation } from "@/components/layout/portal-navigation";

type AdminTheme = "light" | "dark";

type AdminThemeContextValue = {
  theme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
  error: string | null;
};

const ADMIN_THEME_STORAGE_KEY = "camelot-admin-theme";
const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

type AdminThemeSnapshot = {
  theme: AdminTheme;
  error: string | null;
};

const serverThemeSnapshot: AdminThemeSnapshot = {
  theme: "light",
  error: null,
};
let themeSnapshot = serverThemeSnapshot;
let themeSnapshotLoaded = false;
const themeListeners = new Set<() => void>();

function getThemeSnapshot(): AdminThemeSnapshot {
  if (!themeSnapshotLoaded) {
    themeSnapshotLoaded = true;
    try {
      const savedTheme = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
      if (savedTheme === "light" || savedTheme === "dark") {
        themeSnapshot = { theme: savedTheme, error: null };
      }
    } catch {
      themeSnapshot = {
        ...themeSnapshot,
        error: "Theme preference could not be read from this browser.",
      };
    }
  }
  return themeSnapshot;
}

function subscribeToTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

function getServerThemeSnapshot() {
  return serverThemeSnapshot;
}

function setAdminTheme(nextTheme: AdminTheme) {
  try {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, nextTheme);
    themeSnapshot = { theme: nextTheme, error: null };
  } catch {
    themeSnapshot = {
      ...getThemeSnapshot(),
      error: "Theme preference could not be saved in this browser.",
    };
  }
  themeListeners.forEach((listener) => listener());
}

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const { theme, error } = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  return (
    <AdminThemeContext.Provider
      value={{ theme, setTheme: setAdminTheme, error }}
    >
      {children}
    </AdminThemeContext.Provider>
  );
}

function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error("Admin theme controls must be used within AdminThemeProvider.");
  }
  return context;
}

export function AdminPortalFrame({
  children,
  title,
  user,
}: {
  children: ReactNode;
  title: string;
  user: { name: string; image: string | null };
}) {
  const { theme } = useAdminTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      className={`portal${sidebarCollapsed ? " portal-sidebar-collapsed" : ""}`}
      data-admin-theme={theme}
    >
      <PortalNavigation
        isSidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((collapsed) => !collapsed)}
        role="admin"
        title={title}
        user={user}
      />
      <main className="portal-main">
        <div className="portal-preview-notice">
          Signed in · {title} access verified
        </div>
        <div className="portal-admin-content">{children}</div>
        <footer className="portal-admin-footer">
          <small>© 2026 Camelot. All rights reserved.</small>
        </footer>
      </main>
    </div>
  );
}

export function AdminThemeSettings() {
  const { theme, setTheme, error } = useAdminTheme();

  return (
    <section aria-labelledby="admin-appearance-title" className="admin-settings">
      <header className="admin-settings-header">
        <p className="eyebrow">Administration</p>
        <h1>Settings</h1>
        <p>Configure the operational preferences for the Camelot platform.</p>
      </header>
      <fieldset className="admin-appearance-options">
        <legend id="admin-appearance-title">Admin appearance</legend>
        <p className="admin-appearance-description">
          Choose the color theme for your Admin workspace. Your choice is saved
          in this browser.
        </p>
        <div className="admin-theme-options">
          <label className="admin-theme-option">
            <input
              checked={theme === "light"}
              name="admin-theme"
              onChange={() => setTheme("light")}
              type="radio"
              value="light"
            />
            <span className="admin-theme-preview admin-theme-preview-light" />
            <span>
              <strong>Light mode</strong>
              <small>Bright surfaces with dark text</small>
            </span>
          </label>
          <label className="admin-theme-option">
            <input
              checked={theme === "dark"}
              name="admin-theme"
              onChange={() => setTheme("dark")}
              type="radio"
              value="dark"
            />
            <span className="admin-theme-preview admin-theme-preview-dark" />
            <span>
              <strong>Dark mode</strong>
              <small>Dark surfaces with light text</small>
            </span>
          </label>
        </div>
        {error && (
          <p className="admin-theme-error" role="alert">
            {error}
          </p>
        )}
      </fieldset>
    </section>
  );
}
