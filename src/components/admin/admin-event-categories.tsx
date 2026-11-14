"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveEventCategory } from "@/app/(admin)/admin/events/actions";

type Category = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  eventCount: number;
};

export function AdminEventCategories({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await saveEventCategory({
        ...(editing ? { id: editing.id } : {}),
        name: String(form.get("name") ?? ""),
        isActive: editing?.isActive ?? true,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setEditing(null);
      setNotice(editing ? "Event category updated." : "Event category added.");
      router.refresh();
    } catch (actionError) {
      console.error("Could not save an event category.", actionError);
      setError("The category could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(category: Category) {
    setBusy(true);
    setError("");
    try {
      const result = await saveEventCategory({
        id: category.id,
        name: category.name,
        isActive: !category.isActive,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setNotice(`"${category.name}" ${category.isActive ? "deactivated" : "activated"}.`);
      router.refresh();
    } catch (actionError) {
      console.error("Could not update an event category.", actionError);
      setError("The category could not be updated. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-events-page admin-event-categories-page">
      <header className="admin-events-header">
        <div>
          <p className="eyebrow">Operations / Events</p>
          <h1>Event categories</h1>
          <p>Manage the categories used to organize Camelot events.</p>
        </div>
      </header>

      {notice && (
        <p aria-live="polite" className="admin-event-notice">
          {notice}
          <button onClick={() => setNotice("")} type="button" aria-label="Dismiss">×</button>
        </p>
      )}
      {error && <p className="admin-event-error" role="alert">{error}</p>}

      <section className="admin-bookings-panel">
        <form className="admin-event-category-form" onSubmit={submit}>
          <label>
            {editing ? "Edit category" : "New category"}
            <input
              key={editing?.id ?? "new-category"}
              name="name"
              required
              maxLength={80}
              defaultValue={editing?.name ?? ""}
              placeholder="Category name"
            />
          </label>
          <button className="button button-dark" disabled={busy} type="submit">
            {editing ? "Save changes" : "Add category"}
          </button>
          {editing && (
            <button className="button button-outline" onClick={() => setEditing(null)} type="button">
              Cancel
            </button>
          )}
        </form>

        <div className="admin-event-category-table-wrap">
          <table className="admin-event-category-table">
            <colgroup>
              <col className="category-name-column" />
              <col className="category-slug-column" />
              <col className="category-count-column" />
              <col className="category-status-column" />
              <col className="category-actions-column" />
            </colgroup>
            <thead>
              <tr><th>Category</th><th>Slug</th><th>Events</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td><strong>{category.name}</strong></td>
                  <td>{category.slug}</td>
                  <td>{category.eventCount}</td>
                  <td><span className={`admin-event-status ${category.isActive ? "status-confirmed" : "status-cancelled"}`}>{category.isActive ? "Active" : "Inactive"}</span></td>
                  <td>
                    <div className="admin-event-row-actions">
                      <button type="button" onClick={() => setEditing(category)}>Edit</button>
                      <button type="button" disabled={busy} onClick={() => toggle(category)}>
                        {category.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!categories.length && (
                <tr><td className="admin-event-empty" colSpan={5}>No event categories yet. Add one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
