"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  issueTemporaryPassword,
  updateAdminUser,
} from "@/app/(admin)/admin/users/actions";
import type { UserRole } from "@/types";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  image: string | null;
  role: string;
  createdAt: string;
};

type TemporaryPassword = {
  user: AdminUser;
  value: string;
  sessionsRevoked: boolean;
};

export function AdminUserDirectory({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [resettingUserId, setResettingUserId] = useState("");
  const [passwordResult, setPasswordResult] =
    useState<TemporaryPassword | null>(null);
  const [passwordError, setPasswordError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesRole = role === "all" || user.role === role;
      const matchesQuery =
        !normalizedQuery ||
        user.name.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery);
      return matchesRole && matchesQuery;
    });
  }, [query, role, users]);

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setEditError("");
    try {
      const result = await updateAdminUser({
        id: editingUser.id,
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        image: String(formData.get("image") ?? ""),
        role: String(formData.get("role") ?? "") as UserRole,
      });
      if (!result.success) {
        setEditError(result.message);
        return;
      }

      setEditingUser(null);
      router.refresh();
    } catch {
      setEditError("We couldn’t save those changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(user: AdminUser) {
    const confirmed = window.confirm(
      `Confirm that ${user.name} requested a password reset. This will sign them out of all devices and create a temporary password to share with them.`,
    );
    if (!confirmed) return;

    setResettingUserId(user.id);
    setPasswordError("");
    setPasswordResult(null);
    setCopyMessage("");
    try {
      const result = await issueTemporaryPassword(user.id);
      if (!result.success) {
        setPasswordError(result.message);
        return;
      }
      setPasswordResult({
        user,
        value: result.temporaryPassword,
        sessionsRevoked: result.sessionsRevoked,
      });
    } catch {
      setPasswordError(
        "We couldn’t reset this password. Please try again or contact support.",
      );
    } finally {
      setResettingUserId("");
    }
  }

  async function copyPassword() {
    if (!passwordResult) return;
    try {
      await navigator.clipboard.writeText(passwordResult.value);
      setCopyMessage("Temporary password copied.");
    } catch {
      setCopyMessage("Couldn’t copy automatically. Select and copy the password.");
    }
  }

  return (
    <>
      <div className="admin-directory-controls">
        <label className="admin-directory-search">
          <span className="sr-only">Search accounts</span>
          <span aria-hidden="true">⌕</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or email"
            type="search"
            value={query}
          />
        </label>
        <label className="admin-directory-filter">
          <span className="sr-only">Filter by account type</span>
          <select onChange={(event) => setRole(event.target.value)} value={role}>
            <option value="all">All account types</option>
            <option value="customer">Customers</option>
            <option value="agent">Agents</option>
            <option value="admin">Administrators</option>
          </select>
        </label>
        <span className="admin-directory-count">
          {filteredUsers.length} {filteredUsers.length === 1 ? "account" : "accounts"}
        </span>
      </div>
      {passwordError && (
        <p className="admin-directory-error" role="alert">
          {passwordError}
        </p>
      )}
      {filteredUsers.length > 0 ? (
        <div className="admin-directory-table-wrap">
          <table className="admin-directory-table">
            <thead>
              <tr>
                <th scope="col">Account</th>
                <th scope="col">Type</th>
                <th scope="col">Joined</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                    {user.phone && <span>{user.phone}</span>}
                  </td>
                  <td>
                    <span className={`admin-role-badge admin-role-${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <time dateTime={user.createdAt}>
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                  </td>
                  <td>
                    <div className="admin-directory-actions">
                      <button
                        className="admin-directory-action"
                        onClick={() => {
                          setEditingUser(user);
                          setEditError("");
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="admin-directory-action"
                        disabled={resettingUserId === user.id}
                        onClick={() => void resetPassword(user)}
                        type="button"
                      >
                        {resettingUserId === user.id ? "Resetting…" : "Reset password"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-directory-empty">
          <h2>{users.length ? "No matching accounts" : "No accounts yet"}</h2>
          <p>
            {users.length
              ? "Try a different search or account type."
              : "New customer and team accounts will appear here."}
          </p>
        </div>
      )}
      {users.length === 100 && (
        <p className="admin-directory-limit">
          Showing the 100 most recently created accounts.
        </p>
      )}

      {editingUser && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setEditingUser(null);
            }
          }}
        >
          <section
            aria-labelledby="admin-edit-title"
            aria-modal="true"
            className="admin-modal"
            role="dialog"
          >
            <div className="admin-modal-heading">
              <div>
                <p className="eyebrow">Account details</p>
                <h2 id="admin-edit-title">Edit user</h2>
              </div>
              <button
                aria-label="Close edit form"
                className="admin-modal-close"
                disabled={saving}
                onClick={() => setEditingUser(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <form className="admin-user-edit-form" onSubmit={saveUser}>
              <label>
                Full name
                <input
                  autoComplete="name"
                  defaultValue={editingUser.name}
                  maxLength={100}
                  name="name"
                  required
                />
              </label>
              <label>
                Email address
                <input
                  autoComplete="email"
                  defaultValue={editingUser.email}
                  maxLength={254}
                  name="email"
                  required
                  type="email"
                />
              </label>
              <label>
                Phone number
                <input
                  autoComplete="tel"
                  defaultValue={editingUser.phone ?? ""}
                  maxLength={40}
                  name="phone"
                  type="tel"
                />
              </label>
              <label>
                Profile image URL
                <input
                  autoComplete="url"
                  defaultValue={editingUser.image ?? ""}
                  maxLength={2048}
                  name="image"
                  type="url"
                />
              </label>
              <label>
                Account type
                <select defaultValue={editingUser.role} name="role">
                  <option value="customer">Customer</option>
                  <option value="agent">Agent</option>
                  <option value="admin">Administrator</option>
                </select>
              </label>
              {editError && (
                <p className="admin-directory-error" role="alert">
                  {editError}
                </p>
              )}
              <div className="admin-modal-actions">
                <button
                  className="admin-modal-cancel"
                  disabled={saving}
                  onClick={() => setEditingUser(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button className="button button-dark" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {passwordResult && (
        <div className="admin-modal-backdrop">
          <section
            aria-labelledby="admin-password-title"
            aria-modal="true"
            className="admin-modal admin-password-modal"
            role="dialog"
          >
            <div className="admin-modal-heading">
              <div>
                <p className="eyebrow">Password reset</p>
                <h2 id="admin-password-title">Temporary password</h2>
              </div>
              <button
                aria-label="Close password details"
                className="admin-modal-close"
                onClick={() => setPasswordResult(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <p className="admin-password-recipient">
              For {passwordResult.user.name} · {passwordResult.user.email}
            </p>
            <label className="admin-temporary-password">
              Temporary password
              <input readOnly value={passwordResult.value} />
            </label>
            {!passwordResult.sessionsRevoked && (
              <p className="admin-directory-error" role="alert">
                The password was changed, but existing sessions could not be revoked.
                Contact support to secure this account.
              </p>
            )}
            <p className="admin-password-warning">
              Share this password directly using a trusted channel. The user will
              be prompted to choose a new password when they sign in.
            </p>
            {copyMessage && (
              <p className="admin-copy-message" role="status">
                {copyMessage}
              </p>
            )}
            <div className="admin-modal-actions">
              <button
                className="admin-modal-cancel"
                onClick={() => setPasswordResult(null)}
                type="button"
              >
                Close
              </button>
              <button
                className="button button-dark"
                onClick={() => void copyPassword()}
                type="button"
              >
                Copy password
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
