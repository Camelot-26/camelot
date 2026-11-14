"use client";

import Link from "next/link";
import {
  customerEventStatusLabels,
  customerEventStatuses,
  type CustomerEventStatus,
} from "@/lib/customer-event-constants";

type CustomerEventRow = {
  id: string;
  requestId: string;
  eventName: string;
  categoryId: string;
  categoryName: string;
  eventDate: string;
  expectedGuests: number;
  venue: string | null;
  status: CustomerEventStatus;
  submittedAt: string;
  pendingCancellationRequest: boolean;
};

type EventCategory = { id: string; name: string; isActive: boolean };
type EventFilters = {
  q: string;
  category: string;
  status: string;
  date: string;
  page: number;
  pageSize: number;
};

function formatDate(value: string) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function pageHref(filters: EventFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.status) params.set("status", filters.status);
  if (filters.date) params.set("date", filters.date);
  if (filters.pageSize !== 10) params.set("pageSize", String(filters.pageSize));
  params.set("page", String(page));
  return `/customer/events?${params.toString()}`;
}

export function CustomerEvents({
  categories,
  events,
  filters,
  pageCount,
  total,
}: {
  categories: EventCategory[];
  events: CustomerEventRow[];
  filters: EventFilters;
  pageCount: number;
  total: number;
}) {
  const hasFilters =
    !!filters.q || !!filters.category || !!filters.status || !!filters.date;

  return (
    <section className="admin-bookings-page customer-events-page">
      <header className="admin-bookings-header">
        <div>
          <p className="eyebrow">Gather for something special</p>
          <h1>My Events</h1>
          <p>Track event requests and confirmed events linked to your account.</p>
        </div>
        <Link
          className="button button-dark admin-booking-create"
          href="/customer/events/new"
        >
          Submit event request
        </Link>
      </header>

      <section aria-label="My events" className="admin-bookings-panel">
        <form className="admin-bookings-filters customer-event-filters" method="get">
          <label className="admin-directory-search">
            <span className="sr-only">Search by request ID or event name</span>
            <span aria-hidden="true">⌕</span>
            <input
              defaultValue={filters.q}
              name="q"
              placeholder="Request ID or event name"
              type="search"
            />
          </label>
          <label>
            <span className="sr-only">Filter by event category</span>
            <select defaultValue={filters.category} name="category">
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by event status</span>
            <select defaultValue={filters.status} name="status">
              <option value="">All statuses</option>
              {customerEventStatuses.map((status) => (
                <option key={status} value={status}>
                  {customerEventStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by preferred event date</span>
            <input
              aria-label="Filter by event date"
              defaultValue={filters.date}
              name="date"
              type="date"
            />
          </label>
          <button className="admin-booking-filter-submit" type="submit">
            Apply filters
          </button>
          <span className="admin-directory-count">
            {total} {total === 1 ? "event" : "events"}
          </span>
        </form>

        {events.length ? (
          <div className="admin-bookings-table-wrap">
            <table className="admin-directory-table customer-events-table">
              <thead>
                <tr>
                  <th scope="col">Event Request ID</th>
                  <th scope="col">Event name</th>
                  <th scope="col">Category</th>
                  <th scope="col">Preferred event date</th>
                  <th scope="col">Expected guests</th>
                  <th scope="col">Venue / area</th>
                  <th scope="col">Request status</th>
                  <th scope="col">Submitted date</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td data-label="Event Request ID">
                      <strong>{event.requestId}</strong>
                    </td>
                    <td data-label="Event name">{event.eventName}</td>
                    <td data-label="Category">{event.categoryName}</td>
                    <td data-label="Preferred event date">{formatDate(event.eventDate)}</td>
                    <td data-label="Expected guests">{event.expectedGuests}</td>
                    <td data-label="Venue / area">{event.venue ?? "Pending confirmation"}</td>
                    <td data-label="Request status">
                      <span className={`customer-event-status is-${event.status.toLowerCase().replaceAll("_", "-")}`}>
                        {customerEventStatusLabels[event.status]}
                      </span>
                    </td>
                    <td data-label="Submitted date">{formatDateTime(event.submittedAt)}</td>
                    <td data-label="Actions">
                      <Link
                        className="admin-directory-action"
                        href={`/customer/events/${event.id}`}
                      >
                        View
                      </Link>
                      {event.pendingCancellationRequest && (
                        <span className="customer-event-cancellation-state">
                          Cancellation requested
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-directory-empty">
            <h2>{total ? "No events on this page" : "No event requests found"}</h2>
            <p>
              {total
                ? "Choose another page or adjust your filters."
                : hasFilters
                  ? "Try changing the filters to find your event."
                  : "Your event requests and linked confirmed events will appear here."}
            </p>
            {!total && (
              <Link className="button button-dark" href="/customer/events/new">
                Submit an event request
              </Link>
            )}
          </div>
        )}

        <footer className="admin-directory-pagination">
          <span aria-live="polite" className="admin-directory-page-range">
            Showing {total ? (filters.page - 1) * filters.pageSize + 1 : 0}–
            {Math.min(filters.page * filters.pageSize, total)} of {total}
          </span>
          <div className="admin-directory-page-navigation">
            <span>
              Page {filters.page} of {pageCount}
            </span>
            <Link
              aria-disabled={filters.page <= 1}
              className={filters.page <= 1 ? "is-disabled" : ""}
              href={pageHref(filters, Math.max(1, filters.page - 1))}
              tabIndex={filters.page <= 1 ? -1 : undefined}
            >
              Previous
            </Link>
            <Link
              aria-disabled={filters.page >= pageCount}
              className={filters.page >= pageCount ? "is-disabled" : ""}
              href={pageHref(filters, Math.min(pageCount, filters.page + 1))}
              tabIndex={filters.page >= pageCount ? -1 : undefined}
            >
              Next
            </Link>
          </div>
        </footer>
      </section>
    </section>
  );
}
