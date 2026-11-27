"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAdminRole, saveAdminRole } from "@/app/(admin)/admin/roles/actions";
import {
  adminPermissionSections,
  normalizeAdminPermissions,
  type AdminPermission,
} from "@/lib/admin-permissions";

type AdminRole = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  userCount: number;
};

export function AdminRoleManagement({
  canManageRoles,
  lockedRoleId,
  roles,
  title,
}: {
  roles: AdminRole[];
  canManageRoles: boolean;
  lockedRoleId: string | null;
  title: "Roles" | "Permissions";
}) {
  const router = useRouter();
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [creating, setCreating] = useState(false);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function openCreate() {
    if (!canManageRoles) return;
    setEditingRole(null);
    setPermissions(["dashboard.view"]);
    setError("");
    setCreating(true);
  }

  function openEdit(role: AdminRole) {
    if (!canManageRoles || role.id === lockedRoleId) return;
    setEditingRole(role);
    setPermissions(normalizeAdminPermissions(role.permissions));
    setError("");
    setCreating(true);
  }

  function togglePermission(permission: AdminPermission, checked: boolean) {
    setPermissions((current) => {
      const next = new Set(current);
      const [section, level] = permission.split(".") as [
        string,
        "view" | "manage",
      ];
      const view = `${section}.view` as AdminPermission;
      const manage = `${section}.manage` as AdminPermission;
      if (level === "manage") {
        if (checked) {
          next.add(manage);
          next.add(view);
        } else {
          next.delete(manage);
        }
      } else if (checked) {
        next.add(view);
      } else {
        next.delete(view);
        next.delete(manage);
      }
      return [...next];
    });
  }

  async function submitRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const result = await saveAdminRole({
        id: editingRole?.id,
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        permissions,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setCreating(false);
      setNotice(editingRole ? "Role updated." : "Role created.");
      router.refresh();
    } catch (actionError) {
      console.error("Could not save the admin role.", actionError);
      setError("We couldn’t save this role. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function removeRole(role: AdminRole) {
    if (!window.confirm(`Delete the “${role.name}” role?`)) return;
    setError("");
    setNotice("");
    try {
      const result = await deleteAdminRole(role.id);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setNotice("Role deleted.");
      router.refresh();
    } catch (actionError) {
      console.error("Could not delete the admin role.", actionError);
      setError("We couldn’t delete this role. Please try again.");
    }
  }

  return (
    <section className="admin-users-page">
      <header className="admin-users-header">
        <div>
          <p className="eyebrow">People &amp; access</p>
          <h1>{title}</h1>
          <p>
            Create back-office roles and choose which admin sections and actions
            each role can access.
          </p>
        </div>
        {canManageRoles && (
          <button className="button button-dark" onClick={openCreate} type="button">
            Create role <span aria-hidden="true">＋</span>
          </button>
        )}
      </header>

      {notice && <p className="admin-event-notice" role="status">{notice}</p>}
      {error && !creating && <p className="admin-directory-error" role="alert">{error}</p>}

      <section className="admin-users-panel" aria-label="Back-office roles">
        {roles.length ? (
          <div className="admin-directory-table-wrap">
            <table className="admin-directory-table">
              <thead>
                <tr>
                  <th scope="col">Role</th>
                  <th scope="col">Permissions</th>
                  <th scope="col">Admin users</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td>
                      <div className="admin-directory-identity-copy">
                        <strong>{role.name}</strong>
                        <span>{role.description || "No description"}</span>
                      </div>
                    </td>
                    <td>{role.permissions.length} enabled</td>
                    <td>{role.userCount}</td>
                    <td>
                      <div className="admin-directory-actions">
                        {canManageRoles && role.id !== lockedRoleId && (
                          <>
                            <button
                              className="admin-directory-action"
                              onClick={() => openEdit(role)}
                              type="button"
                            >
                              Edit
                            </button>
                            <button
                              className="admin-directory-action"
                              disabled={role.userCount > 0}
                              onClick={() => void removeRole(role)}
                              type="button"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-directory-empty">
            <h2>No custom roles yet</h2>
            <p>Create a role to give back-office accounts access to selected sections.</p>
          </div>
        )}
      </section>

      {creating && (
        <div className="admin-modal-backdrop">
          <section
            aria-labelledby="admin-role-form-title"
            aria-modal="true"
            className="admin-modal admin-role-modal"
            role="dialog"
          >
            <div className="admin-modal-heading">
              <div>
                <p className="eyebrow">Back-office access</p>
                <h2 id="admin-role-form-title">
                  {editingRole ? "Edit role" : "Create role"}
                </h2>
              </div>
              <button
                aria-label="Close role form"
                className="admin-modal-close"
                disabled={saving}
                onClick={() => setCreating(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <form className="admin-user-edit-form" onSubmit={submitRole}>
              <label>
                Role name
                <input
                  autoComplete="off"
                  defaultValue={editingRole?.name ?? ""}
                  maxLength={80}
                  name="name"
                  required
                />
              </label>
              <label>
                Description
                <input
                  defaultValue={editingRole?.description ?? ""}
                  maxLength={240}
                  name="description"
                />
              </label>
              <fieldset className="admin-role-permissions" id="permission-matrix">
                <legend>Section permissions</legend>
                <p>Manage permission includes view permission.</p>
                <div className="admin-role-permission-list">
                  {adminPermissionSections.map((section) => (
                    <div className="admin-role-permission-row" key={section.key}>
                      <strong>{section.label}</strong>
                      <label>
                        <input
                          checked={
                            section.key === "dashboard" ||
                            permissions.includes(`${section.key}.view` as AdminPermission)
                          }
                          disabled={section.key === "dashboard"}
                          onChange={(event) =>
                            togglePermission(
                              `${section.key}.view` as AdminPermission,
                              event.currentTarget.checked,
                            )
                          }
                          type="checkbox"
                        />
                        View
                      </label>
                      {section.canManage && (
                        <label>
                          <input
                            checked={permissions.includes(`${section.key}.manage` as AdminPermission)}
                            onChange={(event) =>
                              togglePermission(
                                `${section.key}.manage` as AdminPermission,
                                event.currentTarget.checked,
                              )
                            }
                            type="checkbox"
                          />
                          Manage
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </fieldset>
              {error && <p className="admin-directory-error" role="alert">{error}</p>}
              <div className="admin-modal-actions">
                <button
                  className="admin-modal-cancel"
                  disabled={saving}
                  onClick={() => setCreating(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button className="button button-dark" disabled={saving}>
                  {saving ? "Saving…" : "Save role"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
