"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteBooking,
  saveBooking,
} from "@/app/(admin)/admin/bookings/actions";
import {
  bookingStatuses,
  bookingTypes,
  type BookingInput,
  type BookingStatusValue,
} from "@/lib/booking-constants";

type CustomerOption = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

type AgentOption = {
  id: string;
  name: string;
  email: string;
};

type BookingRow = {
  id: string;
  bookingNumber: string;
  customerId: string;
  bookingType: string;
  bookingDate: string;
  bookingTime: string;
  adults: number;
  children: number;
  occasion: string | null;
  specialRequests: string | null;
  additionalNotes: string | null;
  assignedAgentId: string | null;
  assignedAt: string | null;
  internalNotes: string | null;
  status: BookingStatusValue;
  createdAt: string;
  updatedAt: string;
  customer: CustomerOption;
  assignedAgent: AgentOption | null;
  statusHistory: {
    id: string;
    previousStatus: BookingStatusValue | null;
    newStatus: BookingStatusValue;
    createdAt: string;
    updatedBy: { name: string } | null;
  }[];
};

type BookingFilters = {
  q: string;
  status: string;
  date: string;
  type: string;
  agent: string;
  sort: "bookingDate" | "createdAt";
  direction: "asc" | "desc";
  page: number;
  pageSize: number;
};

function statusLabel(status: BookingStatusValue) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions = {}) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function bookingFormValues(
  formData: FormData,
  booking: BookingRow | null,
): BookingInput {
  return {
    ...(booking ? { id: booking.id } : {}),
    customerId: String(formData.get("customerId") ?? ""),
    bookingType: String(formData.get("bookingType") ?? ""),
    bookingDate: String(formData.get("bookingDate") ?? ""),
    bookingTime: String(formData.get("bookingTime") ?? ""),
    adults: Number(formData.get("adults")),
    children: Number(formData.get("children")),
    occasion: String(formData.get("occasion") ?? ""),
    specialRequests: String(formData.get("specialRequests") ?? ""),
    additionalNotes: String(formData.get("additionalNotes") ?? ""),
    assignedAgentId: String(formData.get("assignedAgentId") ?? ""),
    internalNotes: String(formData.get("internalNotes") ?? ""),
    status: String(formData.get("status") ?? ""),
  };
}

export function AdminBookingManagement({
  agents,
  bookings,
  customers,
  filters,
  pageCount,
  total,
}: {
  agents: AgentOption[];
  bookings: BookingRow[];
  customers: CustomerOption[];
  filters: BookingFilters;
  pageCount: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [viewing, setViewing] = useState<BookingRow | null>(null);
  const [editing, setEditing] = useState<BookingRow | null | undefined>(
    undefined,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function navigateParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  function submitFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    navigateParams({
      q: String(form.get("q") ?? "").trim(),
      status: String(form.get("status") ?? ""),
      date: String(form.get("date") ?? ""),
      type: String(form.get("type") ?? ""),
      agent: String(form.get("agent") ?? ""),
      page: 1,
    });
  }

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await saveBooking(bookingFormValues(form, editing ?? null));
      if (!result.success) {
        setError(result.message);
        return;
      }
      setEditing(undefined);
      setNotice(editing ? "Booking updated." : "Booking created.");
      router.refresh();
    } catch (actionError) {
      console.error("Could not save an admin booking.", actionError);
      setError("The booking could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeBooking(booking: BookingRow) {
    if (
      !window.confirm(
        `Delete booking ${booking.bookingNumber}? It will be removed from the active directory.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await deleteBooking(booking.id);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setNotice(`Booking ${booking.bookingNumber} deleted.`);
      setViewing(null);
      router.refresh();
    } catch (actionError) {
      console.error("Could not delete an admin booking.", actionError);
      setError("The booking could not be deleted. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function toggleSort(sort: BookingFilters["sort"]) {
    const direction =
      filters.sort === sort && filters.direction === "desc" ? "asc" : "desc";
    navigateParams({ sort, direction, page: 1 });
  }

  return (
    <section className="admin-bookings-page">
      <header className="admin-bookings-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Booking management</h1>
          <p>Review and manage customer dining reservations.</p>
        </div>
        <button
          className="button button-dark admin-booking-create"
          onClick={() => {
            setError("");
            setEditing(null);
          }}
          type="button"
        >
          Create booking
        </button>
      </header>

      {notice && (
        <p aria-live="polite" className="admin-booking-notice">
          {notice}
          <button onClick={() => setNotice("")} type="button" aria-label="Dismiss">
            ×
          </button>
        </p>
      )}
      {error && editing === undefined && (
        <p className="admin-directory-error" role="alert">
          {error}
          <button onClick={() => setError("")} type="button" aria-label="Dismiss">
            ×
          </button>
        </p>
      )}

      <section aria-label="Bookings" className="admin-bookings-panel">
        <form className="admin-bookings-filters" onSubmit={submitFilters}>
          <label className="admin-directory-search">
            <span className="sr-only">Search bookings</span>
            <span aria-hidden="true">⌕</span>
            <input
              defaultValue={filters.q}
              name="q"
              placeholder="Booking ID, customer, or phone"
              type="search"
            />
          </label>
          <label>
            <span className="sr-only">Filter by booking status</span>
            <select defaultValue={filters.status} name="status">
              <option value="">All statuses</option>
              {bookingStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by booking date</span>
            <input
              aria-label="Filter by booking date"
              defaultValue={filters.date}
              name="date"
              type="date"
            />
          </label>
          <label>
            <span className="sr-only">Filter by booking type</span>
            <select defaultValue={filters.type} name="type">
              <option value="">All booking types</option>
              {bookingTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by assigned Agent</span>
            <select defaultValue={filters.agent} name="agent">
              <option value="">All Agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>
          <button className="admin-booking-filter-submit" type="submit">
            Apply filters
          </button>
          <span className="admin-directory-count">
            {total} {total === 1 ? "booking" : "bookings"}
          </span>
        </form>

        {bookings.length ? (
          <div className="admin-bookings-table-wrap">
            <table className="admin-directory-table admin-bookings-table">
              <thead>
                <tr>
                  <th scope="col">Booking ID</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Contact number</th>
                  <th
                    aria-sort={
                      filters.sort === "bookingDate"
                        ? filters.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    scope="col"
                  >
                    <button
                      className="admin-booking-sort"
                      onClick={() => toggleSort("bookingDate")}
                      type="button"
                    >
                      Booking date
                      <span aria-hidden="true">
                        {filters.sort === "bookingDate"
                          ? filters.direction === "asc"
                            ? " ↑"
                            : " ↓"
                          : ""}
                      </span>
                    </button>
                  </th>
                  <th scope="col">Booking time</th>
                  <th scope="col">Guests</th>
                  <th scope="col">Booking type</th>
                  <th scope="col">Assigned Agent</th>
                  <th scope="col">Status</th>
                  <th
                    aria-sort={
                      filters.sort === "createdAt"
                        ? filters.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    scope="col"
                  >
                    <button
                      className="admin-booking-sort"
                      onClick={() => toggleSort("createdAt")}
                      type="button"
                    >
                      Created date
                      <span aria-hidden="true">
                        {filters.sort === "createdAt"
                          ? filters.direction === "asc"
                            ? " ↑"
                            : " ↓"
                          : ""}
                      </span>
                    </button>
                  </th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <strong>{booking.bookingNumber}</strong>
                    </td>
                    <td>{booking.customer.name}</td>
                    <td>{booking.customer.phone || "—"}</td>
                    <td>
                      {formatDate(booking.bookingDate)}
                    </td>
                    <td>{booking.bookingTime}</td>
                    <td>
                      {booking.adults + booking.children}
                      <span className="admin-booking-cell-subtitle">
                        {booking.adults} adult
                        {booking.adults === 1 ? "" : "s"}
                        {booking.children
                          ? ` · ${booking.children} child${booking.children === 1 ? "" : "ren"}`
                          : ""}
                      </span>
                    </td>
                    <td>{booking.bookingType}</td>
                    <td>{booking.assignedAgent?.name ?? "—"}</td>
                    <td>
                      <span
                        className={`booking-status booking-status-${booking.status.toLowerCase().replaceAll("_", "-")}`}
                      >
                        {statusLabel(booking.status)}
                      </span>
                    </td>
                    <td>{formatDate(booking.createdAt)}</td>
                    <td>
                      <div className="admin-directory-actions">
                        <button
                          className="admin-directory-action"
                          onClick={() => {
                            setError("");
                            setViewing(booking);
                          }}
                          type="button"
                        >
                          View
                        </button>
                        <button
                          className="admin-directory-action"
                          onClick={() => {
                            setError("");
                            setEditing(booking);
                          }}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="admin-directory-action admin-booking-delete"
                          disabled={busy}
                          onClick={() => void removeBooking(booking)}
                          type="button"
                        >
                          Delete
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
            <h2>{total ? "No bookings on this page" : "No bookings found"}</h2>
            <p>
              {total
                ? "Try another page or adjust the filters."
                : "Create a booking or change your filters to see matching reservations."}
            </p>
          </div>
        )}

        <footer className="admin-directory-pagination">
          <label>
            Records per page
            <select
              onChange={(event) =>
                navigateParams({ pageSize: event.target.value, page: 1 })
              }
              value={filters.pageSize}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <span aria-live="polite" className="admin-directory-page-range">
            Showing {total ? (filters.page - 1) * filters.pageSize + 1 : 0}–
            {Math.min(filters.page * filters.pageSize, total)} of {total}
          </span>
          <div className="admin-directory-page-navigation">
            <span>
              Page {filters.page} of {pageCount}
            </span>
            <button
              disabled={filters.page <= 1}
              onClick={() => navigateParams({ page: filters.page - 1 })}
              type="button"
            >
              Previous
            </button>
            <button
              disabled={filters.page >= pageCount}
              onClick={() => navigateParams({ page: filters.page + 1 })}
              type="button"
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      {editing !== undefined && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setEditing(undefined);
              setError("");
            }
          }}
        >
          <section
            aria-labelledby="admin-booking-edit-title"
            aria-modal="true"
            className="admin-modal admin-booking-modal"
            role="dialog"
          >
            <div className="admin-modal-heading">
              <div>
                <p className="eyebrow">Booking details</p>
                <h2 id="admin-booking-edit-title">
                  {editing ? `Edit ${editing.bookingNumber}` : "Create booking"}
                </h2>
              </div>
              <button
                aria-label="Close booking form"
                className="admin-modal-close"
                disabled={busy}
                onClick={() => {
                  setEditing(undefined);
                  setError("");
                }}
                type="button"
              >
                ×
              </button>
            </div>
            <form
              className="admin-user-edit-form admin-booking-form"
              key={editing?.id ?? "new-booking"}
              onSubmit={submitBooking}
            >
              <label>
                Customer
                <select
                  defaultValue={editing?.customerId ?? ""}
                  name="customerId"
                  required
                >
                  <option disabled value="">
                    Select a customer
                  </option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} · {customer.email}
                    </option>
                  ))}
                </select>
              </label>
              <div className="admin-booking-form-grid">
                <label>
                  Booking type
                  <select
                    defaultValue={editing?.bookingType ?? bookingTypes[0]}
                    name="bookingType"
                    required
                  >
                    {bookingTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Booking status
                  <select
                    defaultValue={editing?.status ?? bookingStatuses[0]}
                    name="status"
                    required
                  >
                    {bookingStatuses.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Booking date
                  <input
                    defaultValue={editing?.bookingDate ?? ""}
                    name="bookingDate"
                    required
                    type="date"
                  />
                </label>
                <label>
                  Booking time
                  <input
                    defaultValue={editing?.bookingTime ?? ""}
                    name="bookingTime"
                    required
                    type="time"
                  />
                </label>
                <label>
                  Number of adults
                  <input
                    defaultValue={editing?.adults ?? 1}
                    min={1}
                    name="adults"
                    required
                    type="number"
                  />
                </label>
                <label>
                  Number of children
                  <input
                    defaultValue={editing?.children ?? 0}
                    min={0}
                    name="children"
                    required
                    type="number"
                  />
                </label>
                <label>
                  Assign Agent (optional)
                  <select
                    defaultValue={editing?.assignedAgentId ?? ""}
                    name="assignedAgentId"
                  >
                    <option value="">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} · {agent.email}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Occasion (optional)
                  <input
                    defaultValue={editing?.occasion ?? ""}
                    maxLength={100}
                    name="occasion"
                  />
                </label>
              </div>
              <label>
                Special requests
                <textarea
                  defaultValue={editing?.specialRequests ?? ""}
                  maxLength={2000}
                  name="specialRequests"
                  rows={3}
                />
              </label>
              <label>
                Additional notes
                <textarea
                  defaultValue={editing?.additionalNotes ?? ""}
                  maxLength={2000}
                  name="additionalNotes"
                  rows={3}
                />
              </label>
              <label>
                Internal notes (Admin only)
                <textarea
                  defaultValue={editing?.internalNotes ?? ""}
                  maxLength={2000}
                  name="internalNotes"
                  rows={3}
                />
              </label>
              {error && (
                <p className="admin-directory-error" role="alert">
                  {error}
                </p>
              )}
              <div className="admin-modal-actions">
                <button
                  className="admin-modal-cancel"
                  disabled={busy}
                  onClick={() => {
                    setEditing(undefined);
                    setError("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button className="button button-dark" disabled={busy}>
                  {busy ? "Saving…" : editing ? "Save changes" : "Create booking"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {viewing && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setViewing(null);
            }
          }}
        >
          <section
            aria-labelledby="admin-booking-view-title"
            aria-modal="true"
            className="admin-modal admin-booking-modal"
            role="dialog"
          >
            <div className="admin-modal-heading">
              <div>
                <p className="eyebrow">Booking details</p>
                <h2 id="admin-booking-view-title">{viewing.bookingNumber}</h2>
              </div>
              <button
                aria-label="Close booking details"
                className="admin-modal-close"
                onClick={() => setViewing(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="admin-booking-detail-sections">
              <section>
                <h3>Customer information</h3>
                <dl className="admin-booking-details">
                  <DetailRow label="Customer" value={viewing.customer.name} />
                  <DetailRow label="Email" value={viewing.customer.email} />
                  <DetailRow
                    label="Phone"
                    value={viewing.customer.phone || "Not provided"}
                  />
                  <DetailRow label="Customer ID" value={viewing.customer.id} />
                </dl>
              </section>
              <section>
                <h3>Booking information</h3>
                <dl className="admin-booking-details">
                  <DetailRow label="Booking type" value={viewing.bookingType} />
                  <DetailRow
                    label="Date & time"
                    value={`${formatDate(viewing.bookingDate, {
                      month: "long",
                    })} · ${viewing.bookingTime}`}
                  />
                  <DetailRow
                    label="Guests"
                    value={`${viewing.adults} adult${viewing.adults === 1 ? "" : "s"} · ${viewing.children} children`}
                  />
                  <DetailRow
                    label="Occasion"
                    value={viewing.occasion || "Not provided"}
                  />
                  <DetailRow
                    label="Special requests"
                    value={viewing.specialRequests || "None"}
                  />
                  <DetailRow
                    label="Additional notes"
                    value={viewing.additionalNotes || "None"}
                  />
                </dl>
              </section>
              <section>
                <h3>Assignment &amp; status</h3>
                <dl className="admin-booking-details">
                  <DetailRow
                    label="Assigned Agent"
                    value={viewing.assignedAgent?.name ?? "Unassigned"}
                  />
                  <DetailRow
                    label="Assigned date"
                    value={
                      viewing.assignedAt
                        ? formatDateTime(viewing.assignedAt)
                        : "Not assigned"
                    }
                  />
                  <DetailRow
                    label="Internal notes"
                    value={viewing.internalNotes || "None"}
                  />
                  <DetailRow
                    label="Current status"
                    value={statusLabel(viewing.status)}
                  />
                  <DetailRow label="Created at" value={formatDateTime(viewing.createdAt)} />
                  <DetailRow label="Updated at" value={formatDateTime(viewing.updatedAt)} />
                </dl>
              </section>
              <section>
                <h3>Status history</h3>
                {viewing.statusHistory.length ? (
                  <ol className="admin-booking-history">
                    {viewing.statusHistory.map((entry) => (
                      <li key={entry.id}>
                        <strong>
                          {entry.previousStatus
                            ? `${statusLabel(entry.previousStatus)} → `
                            : "Created as "}
                          {statusLabel(entry.newStatus)}
                        </strong>
                        <span>
                          {entry.updatedBy?.name ?? "Admin"} ·{" "}
                          {formatDateTime(entry.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>No status changes recorded.</p>
                )}
              </section>
            </div>
            {error && (
              <p className="admin-directory-error" role="alert">
                {error}
              </p>
            )}
            <div className="admin-modal-actions">
              <button
                className="admin-modal-cancel"
                disabled={busy}
                onClick={() => void removeBooking(viewing)}
                type="button"
              >
                Delete
              </button>
              <button
                className="admin-modal-cancel"
                onClick={() => setViewing(null)}
                type="button"
              >
                Close
              </button>
              <button
                className="button button-dark"
                onClick={() => {
                  setEditing(viewing);
                  setViewing(null);
                }}
                type="button"
              >
                Edit booking
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
