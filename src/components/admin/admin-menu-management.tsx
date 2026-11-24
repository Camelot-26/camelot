"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteMenuItem,
  saveMenuItem,
} from "@/app/(admin)/admin/restaurant/menus/actions";
import type {
  AdminMenuCategory,
  AdminMenuItem,
} from "@/modules/restaurant/types";

type MenuItemDraft = Pick<
  AdminMenuItem,
  "id" | "name" | "categoryId" | "description" | "price" | "isAvailable"
>;

type Filters = { query: string; page: number; pageSize: number };
type CategoryOption = Pick<AdminMenuCategory, "id" | "name" | "isActive">;

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

function pageHref(filters: Filters, page: number) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  params.set("page", String(page));
  params.set("pageSize", String(filters.pageSize));
  return `/admin/restaurant/menus?${params.toString()}`;
}

export function AdminMenuManagement({
  categories,
  items,
  filters,
  pageCount,
  total,
}: {
  categories: CategoryOption[];
  items: AdminMenuItem[];
  filters: Filters;
  pageCount: number;
  total: number;
}) {
  const router = useRouter();
  const [dialogItem, setDialogItem] = useState<MenuItemDraft | "new" | null>(
    null,
  );
  const [viewing, setViewing] = useState<AdminMenuItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const hasActiveCategory = categories.some((category) => category.isActive);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");

    try {
      const result = await saveMenuItem({
        ...(dialogItem !== "new" && dialogItem ? { id: dialogItem.id } : {}),
        name: String(form.get("name") ?? ""),
        categoryId: String(form.get("categoryId") ?? ""),
        description: String(form.get("description") ?? ""),
        price: String(form.get("price") ?? ""),
        isAvailable: form.get("isAvailable") === "on",
      });
      if (!result.success) {
        setError(result.message);
        return;
      }

      const wasEditing = dialogItem !== "new";
      setDialogItem(null);
      setNotice(wasEditing ? "Menu item updated." : "Menu item added.");
      router.refresh();
    } catch (actionError) {
      console.error("Could not save a restaurant menu item.", actionError);
      setError("The menu item could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: AdminMenuItem) {
    if (!window.confirm(`Delete "${item.name}" from the menu?`)) return;
    setBusy(true);
    setError("");
    try {
      const result = await deleteMenuItem({ id: item.id });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setNotice(`"${item.name}" was deleted.`);
      router.refresh();
    } catch (actionError) {
      console.error("Could not delete a restaurant menu item.", actionError);
      setError("The menu item could not be deleted. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-events-page admin-menu-page">
      <header className="admin-events-header">
        <div>
          <p className="eyebrow">Restaurant / Menus</p>
          <h1>Menu items</h1>
          <p>Manage restaurant dishes, categories, prices, and availability.</p>
          {!hasActiveCategory && (
            <p className="admin-menu-category-hint">
              Create an active menu category before adding menu items.
            </p>
          )}
        </div>
        {hasActiveCategory ? (
          <button
            className="button button-dark"
            onClick={() => {
              setError("");
              setDialogItem("new");
            }}
            type="button"
          >
            Add menu item <span aria-hidden="true">＋</span>
          </button>
        ) : (
          <Link className="button button-dark" href="/admin/restaurant/categories">
            Create menu category <span aria-hidden="true">→</span>
          </Link>
        )}
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
      {error && !dialogItem && (
        <p className="admin-event-error" role="alert">{error}</p>
      )}

      <section className="admin-bookings-panel">
        <form action="/admin/restaurant/menus" className="admin-menu-filters">
          <label>
            Search menu
            <input
              aria-label="Search menu items"
              defaultValue={filters.query}
              maxLength={120}
              name="q"
              placeholder="Search by item, category, or description"
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
          <table className="admin-event-category-table admin-menu-table">
            <thead>
              <tr>
                <th>Menu item</th>
                <th>Category</th>
                <th>Price (USD)</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <span className="admin-menu-description">{item.description}</span>
                  </td>
                  <td>{item.categoryName}</td>
                  <td>{formatPrice(item.price)}</td>
                  <td>
                    <span className={`admin-event-status ${item.isAvailable ? "status-confirmed" : "status-cancelled"}`}>
                      {item.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-event-row-actions">
                      <button onClick={() => setViewing(item)} type="button">View</button>
                      <button
                        disabled={busy}
                        onClick={() => {
                          setError("");
                          setDialogItem(item);
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => void remove(item)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td className="admin-event-empty" colSpan={5}>
                    {filters.query
                      ? "No menu items match your search."
                      : "No menu items yet. Add one to get started."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="admin-menu-pagination">
          <span>
            {total === 0
              ? "No items"
              : `Showing ${(filters.page - 1) * filters.pageSize + 1}–${Math.min(filters.page * filters.pageSize, total)} of ${total} items`}
          </span>
          <nav aria-label="Menu item pages">
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

      {dialogItem && (
        <div className="admin-menu-overlay">
          <section
            aria-labelledby="admin-menu-dialog-title"
            aria-modal="true"
            className="admin-menu-dialog"
            role="dialog"
          >
            <header>
              <div>
                <p className="eyebrow">Restaurant / Menus</p>
                <h2 id="admin-menu-dialog-title">
                  {dialogItem === "new" ? "Add menu item" : "Edit menu item"}
                </h2>
              </div>
              <button
                aria-label="Close"
                className="admin-menu-close"
                onClick={() => setDialogItem(null)}
                type="button"
              >
                ×
              </button>
            </header>
            <form className="admin-menu-form" onSubmit={submit}>
              <label>
                Item name
                <input
                  autoFocus
                  defaultValue={dialogItem === "new" ? "" : dialogItem.name}
                  maxLength={120}
                  name="name"
                  placeholder="e.g. Garden salad"
                  required
                />
              </label>
              <label>
                Category
                <select
                  defaultValue={dialogItem === "new" ? "" : dialogItem.categoryId}
                  name="categoryId"
                  required
                >
                  <option disabled value="">Choose a category</option>
                  {categories
                    .filter((category) =>
                      category.isActive ||
                      (dialogItem !== "new" && category.id === dialogItem.categoryId),
                    )
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}{category.isActive ? "" : " (inactive)"}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Price (USD)
                <input
                  defaultValue={dialogItem === "new" ? "" : dialogItem.price.toFixed(2)}
                  min="0"
                  name="price"
                  required
                  step="0.01"
                  type="number"
                />
              </label>
              <label className="admin-menu-description-field">
                Description
                <textarea
                  defaultValue={dialogItem === "new" ? "" : dialogItem.description}
                  maxLength={2000}
                  name="description"
                  rows={4}
                />
              </label>
              <label className="admin-menu-availability">
                <input
                  defaultChecked={dialogItem === "new" || dialogItem.isAvailable}
                  name="isAvailable"
                  type="checkbox"
                />
                Available to order
              </label>
              {error && <p className="admin-event-error" role="alert">{error}</p>}
              <footer>
                <button
                  className="button button-outline"
                  onClick={() => setDialogItem(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button className="button button-dark" disabled={busy} type="submit">
                  {busy ? "Saving…" : "Save menu item"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {viewing && (
        <div className="admin-menu-overlay">
          <section
            aria-labelledby="admin-menu-view-title"
            aria-modal="true"
            className="admin-menu-dialog admin-menu-detail"
            role="dialog"
          >
            <header>
              <div>
                <p className="eyebrow">Menu item details</p>
                <h2 id="admin-menu-view-title">{viewing.name}</h2>
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
              <div><dt>Category</dt><dd>{viewing.categoryName}</dd></div>
              <div><dt>Price</dt><dd>{formatPrice(viewing.price)}</dd></div>
              <div>
                <dt>Availability</dt>
                <dd>{viewing.isAvailable ? "Available" : "Unavailable"}</dd>
              </div>
              <div className="admin-menu-detail-description">
                <dt>Description</dt><dd>{viewing.description || "No description provided."}</dd>
              </div>
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
                  setDialogItem(viewing);
                }}
                type="button"
              >
                Edit item
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
