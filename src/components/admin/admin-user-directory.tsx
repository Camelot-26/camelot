"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
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

type TemporaryPassword =
  | {
      user: AdminUser;
      emailSent: true;
      sessionsRevoked: boolean;
    }
  | {
      user: AdminUser;
      emailSent: false;
      sessionsRevoked: boolean;
      message: string;
    };

export function AdminUserDirectory({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewingUser, setViewingUser] = useState<AdminUser | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const [uploadedProfileImage, setUploadedProfileImage] = useState("");
  const [readingProfileImage, setReadingProfileImage] = useState(false);
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
  const [passwordMode, setPasswordMode] = useState<"generated" | "manual">(
    "generated",
  );
  const [manualPassword, setManualPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordResult, setPasswordResult] = useState<TemporaryPassword | null>(
    null,
  );
  const [passwordError, setPasswordError] = useState("");
  const imageUrlInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const imageReaderRef = useRef<FileReader | null>(null);

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
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageUsers = useMemo(
    () => filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filteredUsers, pageSize],
  );
  const firstRecord = filteredUsers.length
    ? (currentPage - 1) * pageSize + 1
    : 0;
  const lastRecord = Math.min(currentPage * pageSize, filteredUsers.length);

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser || readingProfileImage) return;

    const formData = new FormData(event.currentTarget);
    setSaving(true);
    setEditError("");
    try {
      const result = await updateAdminUser({
        id: editingUser.id,
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        image:
          uploadedProfileImage || String(formData.get("image") ?? ""),
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

  function openEditUser(user: AdminUser) {
    imageReaderRef.current?.abort();
    imageReaderRef.current = null;
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
    setEditingUser(user);
    setProfileImagePreview(user.image ?? "");
    setUploadedProfileImage(
      user.image?.startsWith("data:image/") ? user.image : "",
    );
    setReadingProfileImage(false);
    setEditError("");
  }

  function handleProfileImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!supportedTypes.includes(file.type)) {
      setEditError("Choose a PNG, JPEG, or WebP image.");
      event.currentTarget.value = "";
      return;
    }
    if (file.size > 512 * 1024) {
      setEditError("Choose an image smaller than 512 KB.");
      event.currentTarget.value = "";
      return;
    }

    imageReaderRef.current?.abort();
    setReadingProfileImage(true);
    setEditError("");
    const reader = new FileReader();
    imageReaderRef.current = reader;
    reader.onload = () => {
      if (imageReaderRef.current !== reader) return;
      imageReaderRef.current = null;
      setReadingProfileImage(false);
      if (typeof reader.result !== "string") {
        setEditError("We couldn’t read that image. Please try another file.");
        return;
      }

      setUploadedProfileImage(reader.result);
      setProfileImagePreview(reader.result);
      setEditError("");
    };
    reader.onerror = () => {
      if (imageReaderRef.current !== reader) return;
      imageReaderRef.current = null;
      setReadingProfileImage(false);
      setEditError("We couldn’t read that image. Please try another file.");
    };
    reader.onabort = () => {
      if (imageReaderRef.current !== reader) return;
      imageReaderRef.current = null;
      setReadingProfileImage(false);
    };
    reader.readAsDataURL(file);
  }

  function removeProfileImage() {
    imageReaderRef.current?.abort();
    imageReaderRef.current = null;
    setReadingProfileImage(false);
    setProfileImagePreview("");
    setUploadedProfileImage("");
    if (imageUrlInputRef.current) imageUrlInputRef.current.value = "";
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
  }

  function openPasswordReset(user: AdminUser) {
    setPasswordTarget(user);
    setPasswordMode("generated");
    setManualPassword("");
    setPasswordError("");
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordTarget) return;

    const user = passwordTarget;
    const confirmed = window.confirm(
      `Confirm that ${user.name} requested a password reset. A temporary password will be emailed to ${user.email}, and they will be signed out of all devices.`,
    );
    if (!confirmed) return;

    setResettingPassword(true);
    setPasswordError("");
    setPasswordResult(null);
    try {
      const result = await issueTemporaryPassword(
        user.id,
        passwordMode === "manual" ? manualPassword : null,
      );
      if (!result.success) {
        if (result.passwordWasSet) {
          setPasswordTarget(null);
          setPasswordResult({
            user,
            emailSent: false,
            sessionsRevoked: result.sessionsRevoked ?? false,
            message: result.message,
          });
          router.refresh();
        } else {
          setPasswordError(result.message);
        }
        return;
      }
      setPasswordResult({
        user,
        emailSent: true,
        sessionsRevoked: result.sessionsRevoked,
      });
      setPasswordTarget(null);
      router.refresh();
    } catch {
      setPasswordError("We couldn’t complete the reset. Please try again.");
    } finally {
      setResettingPassword(false);
    }
  }

  return (
    <>
      <div className="admin-directory-controls">
        <label className="admin-directory-search">
          <span className="sr-only">Search accounts</span>
          <span aria-hidden="true">⌕</span>
          <input
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search name or email"
            type="search"
            value={query}
          />
        </label>
        <label className="admin-directory-filter">
          <span className="sr-only">Filter by account type</span>
          <select
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
            value={role}
          >
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
              {pageUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="admin-directory-identity">
                      {user.image ? (
                        <Image
                          alt=""
                          className="admin-directory-avatar"
                          height={38}
                          src={user.image}
                          unoptimized
                          width={38}
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="admin-directory-avatar-fallback"
                        >
                          {user.name.trim().slice(0, 1).toUpperCase() || "U"}
                        </span>
                      )}
                      <div className="admin-directory-identity-copy">
                        <strong>{user.name}</strong>
                        <span>{user.email}</span>
                        {user.phone && <span>{user.phone}</span>}
                      </div>
                    </div>
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
                        onClick={() => setViewingUser(user)}
                        type="button"
                      >
                        View
                      </button>
                      <button
                        className="admin-directory-action"
                        onClick={() => openEditUser(user)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="admin-directory-action"
                        onClick={() => openPasswordReset(user)}
                        type="button"
                      >
                        Reset password
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
      <div className="admin-directory-pagination">
        <label>
          Records per page
          <select
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            value={pageSize}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        <span aria-live="polite" className="admin-directory-page-range">
          Showing {firstRecord}–{lastRecord} of {filteredUsers.length}
        </span>
        <div className="admin-directory-page-navigation">
          <span>
            Page {currentPage} of {pageCount}
          </span>
          <button
            aria-label="Previous page"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
            type="button"
          >
            Previous
          </button>
          <button
            aria-label="Next page"
            disabled={currentPage === pageCount}
            onClick={() => setPage(currentPage + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
      {users.length === 100 && (
        <p className="admin-directory-limit">
          Showing the 100 most recently created accounts.
        </p>
      )}

      {viewingUser && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewingUser(null);
            }
          }}
        >
          <section
            aria-labelledby="admin-view-title"
            aria-modal="true"
            className="admin-modal admin-user-view-modal"
            role="dialog"
          >
            <div className="admin-modal-heading">
              <div>
                <p className="eyebrow">Account details</p>
                <h2 id="admin-view-title">User profile</h2>
              </div>
              <button
                aria-label="Close user details"
                className="admin-modal-close"
                onClick={() => setViewingUser(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="admin-user-view-profile">
              {viewingUser.image ? (
                <Image
                  alt={`${viewingUser.name}'s profile`}
                  className="admin-user-view-avatar"
                  height={80}
                  src={viewingUser.image}
                  unoptimized
                  width={80}
                />
              ) : (
                <span aria-hidden="true" className="admin-user-view-avatar-fallback">
                  {viewingUser.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div>
                <h3>{viewingUser.name}</h3>
                <span
                  className={`admin-role-badge admin-role-${viewingUser.role}`}
                >
                  {viewingUser.role}
                </span>
              </div>
            </div>
            <dl className="admin-user-view-details">
              <div>
                <dt>Email address</dt>
                <dd>{viewingUser.email}</dd>
              </div>
              <div>
                <dt>Phone number</dt>
                <dd>{viewingUser.phone || "Not provided"}</dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd>
                  {new Date(viewingUser.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
            <div className="admin-modal-actions">
              <button
                className="admin-modal-cancel"
                onClick={() => setViewingUser(null)}
                type="button"
              >
                Close
              </button>
              <button
                className="button button-dark"
                onClick={() => {
                  setViewingUser(null);
                  openEditUser(viewingUser);
                }}
                type="button"
              >
                Edit user
              </button>
            </div>
          </section>
        </div>
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
              <div className="admin-profile-image-editor">
                <label>
                  Profile image URL
                  <input
                    autoComplete="url"
                    defaultValue={editingUser.image?.startsWith("data:")
                      ? ""
                      : editingUser.image ?? ""}
                    maxLength={2048}
                    name="image"
                    ref={imageUrlInputRef}
                    onChange={(event) => {
                      imageReaderRef.current?.abort();
                      imageReaderRef.current = null;
                      setReadingProfileImage(false);
                      setUploadedProfileImage("");
                      setProfileImagePreview(event.currentTarget.value);
                    }}
                    type="text"
                  />
                </label>
                <label>
                  Upload profile image
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleProfileImageChange}
                    ref={imageFileInputRef}
                    type="file"
                  />
                  <small>PNG, JPEG, or WebP. Maximum file size: 512 KB.</small>
                </label>
                {profileImagePreview && (
                  <div className="admin-profile-image-preview">
                    <Image
                      alt="Profile image preview"
                      height={72}
                      src={profileImagePreview}
                      unoptimized
                      width={72}
                    />
                    <button
                      className="admin-directory-action"
                      onClick={removeProfileImage}
                      type="button"
                    >
                      Remove image
                    </button>
                  </div>
                )}
              </div>
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
                  disabled={saving || readingProfileImage}
                  onClick={() => setEditingUser(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="button button-dark"
                  disabled={saving || readingProfileImage}
                >
                  {readingProfileImage
                    ? "Reading image…"
                    : saving
                      ? "Saving…"
                      : "Save changes"}
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
                <h2 id="admin-password-title">
                  {passwordResult.emailSent ? "Email sent" : "Email not sent"}
                </h2>
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
            {passwordResult.emailSent ? (
              <p className="admin-password-warning">
                The temporary password was emailed. The user must choose a new
                password after signing in.
              </p>
            ) : (
              <p className="admin-directory-error" role="alert">
                {passwordResult.message}
              </p>
            )}
            {passwordResult.emailSent && !passwordResult.sessionsRevoked && (
              <p className="admin-directory-error" role="alert">
                The password was changed and emailed, but existing sessions could
                not be revoked. Contact support to secure this account.
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
            </div>
          </section>
        </div>
      )}

      {passwordTarget && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !resettingPassword) {
              setPasswordTarget(null);
            }
          }}
        >
          <section
            aria-labelledby="admin-password-reset-title"
            aria-modal="true"
            className="admin-modal admin-password-modal"
            role="dialog"
          >
            <div className="admin-modal-heading">
              <div>
                <p className="eyebrow">Password reset</p>
                <h2 id="admin-password-reset-title">Email a temporary password</h2>
              </div>
              <button
                aria-label="Close password reset form"
                className="admin-modal-close"
                disabled={resettingPassword}
                onClick={() => setPasswordTarget(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <p className="admin-password-recipient">
              For {passwordTarget.name} · {passwordTarget.email}
            </p>
            <form className="admin-user-edit-form" onSubmit={resetPassword}>
              <fieldset className="admin-password-options">
                <legend>Temporary password</legend>
                <label className="admin-password-option">
                  <input
                    checked={passwordMode === "generated"}
                    name="passwordMode"
                    onChange={() => setPasswordMode("generated")}
                    type="radio"
                  />
                  <span>Generate a secure password automatically</span>
                </label>
                <label className="admin-password-option">
                  <input
                    checked={passwordMode === "manual"}
                    name="passwordMode"
                    onChange={() => setPasswordMode("manual")}
                    type="radio"
                  />
                  <span>Enter a password manually</span>
                </label>
              </fieldset>
              {passwordMode === "manual" && (
                <label>
                  Temporary password
                  <input
                    autoComplete="new-password"
                    maxLength={128}
                    minLength={12}
                    onChange={(event) => setManualPassword(event.target.value)}
                    required
                    type="password"
                    value={manualPassword}
                  />
                  <span className="admin-password-hint">
                    Use at least 12 characters. The user will be asked to change
                    it after signing in.
                  </span>
                </label>
              )}
              <p className="admin-password-warning">
                The password will be sent to this account’s email address. Their
                active sessions will be revoked.
              </p>
              {passwordError && (
                <p className="admin-directory-error" role="alert">
                  {passwordError}
                </p>
              )}
              <div className="admin-modal-actions">
                <button
                  className="admin-modal-cancel"
                  disabled={resettingPassword}
                  onClick={() => setPasswordTarget(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button className="button button-dark" disabled={resettingPassword}>
                  {resettingPassword ? "Sending…" : "Reset and email"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
