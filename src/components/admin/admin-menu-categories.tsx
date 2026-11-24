"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteMenuCategory,
  saveMenuCategory,
} from "@/app/(admin)/admin/restaurant/categories/actions";
import type { AdminMenuCategory } from "@/modules/restaurant/types";

type CategoryDraft = Pick<AdminMenuCategory, "id" | "name" | "isActive">;
type Filters = { query: string; page: number; pageSize: number };

function pageHref(filters: Filters, page: number) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  params.set("page", String(page));
  params.set("pageSize", String(filters.pageSize));
  return `/admin/restaurant/categories?${params.toString()}`;
}

export function AdminMenuCategories({
  categories,
  filters,
  pageCount,
  total,
}: {
  categories: AdminMenuCategory[];
  filters: Filters;
  pageCount: number;
  total: number;
}) {
  const router = useRouter();
  const [dialogCategory, setDialogCategory] = useState<CategoryDraft | "new" | null>(
    null,
  );
  const [viewing, setViewing] = useState<AdminMenuCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");

    try {
      const result = await saveMenuCategory({
        ...(dialogCategory !== "new" && dialogCategory
          ? { id: dialogCategory.id }
          : {}),
        name: String(form.get("name") ?? ""),
        isActive: form.get("isActive") === "on",
      });
      if (!result.success) {
        setError(result.message);
        return;
      }

      const wasEditing = dialogCategory !== "new";
      setDialogCategory(null);
      setNotice(wasEditing ? "Menu category updated." : "Menu category added.");
      router.refresh();
    } catch (actionError) {
      console.error("Could not save a restaurant menu category.", actionError);
      setError("The menu category could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(category: AdminMenuCategory) {
    if (!window.confirm(`Delete "${category.name}"?`)) return;
    setBusy(true);
    setError("");
    try {
      const result = await deleteMenuCategory({ id: category.id });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setNotice(`"${category.name}" was deleted.`);
      router.refresh();
    } catch (actionError) {
      console.error("Could not delete a restaurant menu category.", actionError);
      setError("The menu category could not be deleted. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-events-page admin-menu-page admin-menu-category-page">
      <header className="admin-events-header">
        <div>
          <p className="eyebrow">Restaurant / Menu Categories</p>
          <h1>Menu categories</h1>
          <p>Organize restaurant menu items into categories.</p>
        </div>
        <button
          className="button button-dark"
          onClick={() => {
            setError("");
            setDialogCategory("new");
          }}
          type="button"
        >
          Add category <span aria-hidden="true">＋</span>
        </button>
      </header>

      {notice && (
        <p aria-live="polite" className="admin-event-notice">
          {notice}
          <button
            aria-label="Dismiss"
            onClick={() => setNotice("")}
            type="button"
          >
            ×
          </button>
        </p>
      )}
      {error && !dialogCategory && (
        <p className="admin-event-error" role="alert">{error}</p>
      )}

      <section className="admin-bookings-panel">
        <form action="/admin/restaurant/categories" className="admin-menu-filters">
          <label>
            Search categories
            <input
              aria-label="Search menu categories"
              defaultValue={filters.query}
              maxLength={120}
              name="q"
              placeholder="Search category names"
              type="search"
            />
          </label>
          <label>
            Per page
            <select defaultValue={filters.pageSize} name="pageSize">
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
          <button className="button button-outline" type="submit">Search</button>
        </form>

        <div className="admin-event-category-table-wrap">
          <table className="admin-event-category-table admin-menu-category-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Menu items</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td><strong>{category.name}</strong></td>
                  <td>{category.itemCount}</td>
                  <td>
                    <span className={`admin-event-status ${category.isActive ? "status-confirmed" : "status-cancelled"}`}>
                      {category.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-event-row-actions">
                      <button onClick={() => setViewing(category)} type="button">View</button>
                      <button
                        disabled={busy}
                        onClick={() => {
                          setError("");
                          setDialogCategory(category);
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        disabled={busy || category.itemCount > 0}
                        onClick={() => void remove(category)}
                        title={category.itemCount > 0 ? "Move or delete its menu items first" : undefined}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!categories.length && (
                <tr>
                  <td className="admin-event-empty" colSpan={4}>
                    {filters.query
                      ? "No menu categories match your search."
                      : "No menu categories yet. Add one to get started."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="admin-menu-pagination">
          <span>
            {total === 0
              ? "No categories"
              : `Showing ${(filters.page - 1) * filters.pageSize + 1}–${Math.min(filters.page * filters.pageSize, total)} of ${total} categories`}
          </span>
          <nav aria-label="Menu category pages">
            <Link
              aria-disabled={filters.page <= 1}
              className={filters.page <= 1 ? "is-disabled" : ""}
              href={pageHref(filters, Math.max(1, filters.page - 1))}
              tabIndex={filters.page <= 1 ? -1 : undefined}
            >
              Previous
            </Link>
            <span>Page {filters.page} of {pageCount}</span>
            <Link
              aria-disabled={filters.page >= pageCount}
              className={filters.page >= pageCount ? "is-disabled" : ""}
              href={pageHref(filters, Math.min(pageCount, filters.page + 1))}
              tabIndex={filters.page >= pageCount ? -1 : undefined}
            >
              Next
            </Link>
          </nav>
        </footer>
      </section>

      {dialogCategory && (
        <div className="admin-menu-overlay">
          <section
            aria-labelledby="admin-menu-category-dialog-title"
            aria-modal="true"
            className="admin-menu-dialog admin-menu-category-dialog"
            role="dialog"
          >
            <header>
              <div>
                <p className="eyebrow">Restaurant / Menu Categories</p>
                <h2 id="admin-menu-category-dialog-title">
                  {dialogCategory === "new" ? "Add category" : "Edit category"}
                </h2>
              </div>
              <button
                aria-label="Close"
                className="admin-menu-close"
                onClick={() => setDialogCategory(null)}
                type="button"
              >
                ×
              </button>
            </header>
            <form className="admin-menu-form" onSubmit={submit}>
              <label className="admin-menu-category-name-field">
                Category name
                <input
                  autoFocus
                  defaultValue={dialogCategory === "new" ? "" : dialogCategory.name}
                  maxLength={80}
                  name="name"
                  placeholder="e.g. Starters"
                  required
                />
              </label>
              <label className="admin-menu-availability">
                <input
                  defaultChecked={dialogCategory === "new" || dialogCategory.isActive}
                  name="isActive"
                  type="checkbox"
                />
                Active and available for new menu items
              </label>
              {error && <p className="admin-event-error" role="alert">{error}</p>}
              <footer>
                <button
                  className="button button-outline"
                  onClick={() => setDialogCategory(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button className="button button-dark" disabled={busy} type="submit">
                  {busy ? "Saving…" : "Save category"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {viewing && (
        <div className="admin-menu-overlay">
          <section
            aria-labelledby="admin-menu-category-view-title"
            aria-modal="true"
            className="admin-menu-dialog admin-menu-detail"
            role="dialog"
          >
            <header>
              <div>
                <p className="eyebrow">Menu category details</p>
                <h2 id="admin-menu-category-view-title">{viewing.name}</h2>
              </div>
              <button
                aria-label="Close"
                className="admin-menu-close"
                onClick={() => setViewing(null)}
                type="button"
              >
                ×
              </button>
            </header>
            <dl>
              <div>
                <dt>Status</dt>
                <dd>{viewing.isActive ? "Active" : "Inactive"}</dd>
              </div>
              <div><dt>Menu items</dt><dd>{viewing.itemCount}</dd></div>
              <div><dt>Created</dt><dd>{new Date(viewing.createdAt).toLocaleString()}</dd></div>
              <div><dt>Last updated</dt><dd>{new Date(viewing.updatedAt).toLocaleString()}</dd></div>
            </dl>
            <footer>
              <button className="button button-outline" onClick={() => setViewing(null)} type="button">
                Close
              </button>
              <button
                className="button button-dark"
                onClick={() => {
                  setViewing(null);
                  setDialogCategory(viewing);
                }}
                type="button"
              >
                Edit category
              </button>
            </footer>
          </section>
        </div>
      )}

      <p className="admin-menu-categories-footer">
        <Link href="/admin/restaurant/menus">Go to menu items <span aria-hidden="true">→</span></Link>
      </p>
    </section>
  );
}
