"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestBookingCancellation } from "@/app/(customer)/customer/bookings/actions";
import {
  bookingStatuses,
  type BookingStatusValue,
} from "@/lib/booking-constants";

type CustomerBookingRow = {
  id: string;
  bookingNumber: string;
  bookingDate: string;
  bookingTime: string;
  bookingType: string;
  adults: number;
  children: number;
  status: BookingStatusValue;
  createdAt: string;
  hasPendingCancellationRequest: boolean;
};

type CustomerBookingFilters = {
  q: string;
  status: string;
  date: string;
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

function formatDate(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function canRequestCancellation(status: BookingStatusValue) {
  return status === "PENDING" || status === "CONFIRMED";
}

function pageHref(filters: CustomerBookingFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.date) params.set("date", filters.date);
  if (filters.pageSize !== 10) params.set("pageSize", String(filters.pageSize));
  params.set("page", String(page));
  return `/customer/bookings?${params.toString()}`;
}

export function CustomerBookings({
  bookings,
  filters,
  pageCount,
  total,
}: {
  bookings: CustomerBookingRow[];
  filters: CustomerBookingFilters;
  pageCount: number;
  total: number;
}) {
  const [cancellationBooking, setCancellationBooking] =
    useState<CustomerBookingRow | null>(null);

  return (
    <section className="admin-bookings-page customer-bookings-page">
      <header className="admin-bookings-header">
        <div>
          <p className="eyebrow">Your visits</p>
          <h1>My bookings</h1>
          <p>Review your reservations and send a cancellation request.</p>
        </div>
        <Link
          className="button button-dark admin-booking-create"
          href="/customer/bookings/new"
        >
          Create booking
        </Link>
      </header>

      <section aria-label="My bookings" className="admin-bookings-panel">
        <form className="admin-bookings-filters" method="get">
          <label className="admin-directory-search">
            <span className="sr-only">Search by booking ID</span>
            <span aria-hidden="true">⌕</span>
            <input
              defaultValue={filters.q}
              name="q"
              placeholder="Search by booking ID"
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
          <button className="admin-booking-filter-submit" type="submit">
            Apply filters
          </button>
          <span className="admin-directory-count">
            {total} {total === 1 ? "booking" : "bookings"}
          </span>
        </form>

        {bookings.length ? (
          <div className="admin-bookings-table-wrap">
            <table className="admin-directory-table customer-bookings-table">
              <thead>
                <tr>
                  <th scope="col">Booking ID</th>
                  <th scope="col">Booking date</th>
                  <th scope="col">Booking time</th>
                  <th scope="col">Booking type</th>
                  <th scope="col">Guests</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created date</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td data-label="Booking ID">
                      <strong>{booking.bookingNumber}</strong>
                    </td>
                    <td data-label="Booking date">{formatDate(booking.bookingDate)}</td>
                    <td data-label="Booking time">{booking.bookingTime}</td>
                    <td data-label="Booking type">{booking.bookingType}</td>
                    <td data-label="Guests">
                      {booking.adults + booking.children}
                      <span className="admin-booking-cell-subtitle">
                        {booking.adults} adult{booking.adults === 1 ? "" : "s"}
                        {booking.children
                          ? ` · ${booking.children} child${booking.children === 1 ? "" : "ren"}`
                          : ""}
                      </span>
                    </td>
                    <td data-label="Status">
                      <span
                        className={`booking-status booking-status-${booking.status.toLowerCase().replaceAll("_", "-")}`}
                      >
                        {statusLabel(booking.status)}
                      </span>
                    </td>
                    <td data-label="Created date">{formatDate(booking.createdAt)}</td>
                    <td data-label="Actions">
                      <div className="customer-booking-actions">
                        <Link
                          className="admin-directory-action"
                          href={`/customer/bookings/${booking.id}`}
                        >
                          View
                        </Link>
                        {canRequestCancellation(booking.status) &&
                          !booking.hasPendingCancellationRequest && (
                            <button
                              className="admin-directory-action"
                              onClick={() => setCancellationBooking(booking)}
                              type="button"
                            >
                              Request cancellation
                            </button>
                          )}
                        {booking.hasPendingCancellationRequest && (
                          <span className="customer-booking-request-status">
                            Cancellation pending
                          </span>
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
            <h2>{total ? "No bookings on this page" : "No bookings found"}</h2>
            <p>
              {total
                ? "Choose another page or adjust your filters."
                : filters.q || filters.status || filters.date
                  ? "Try changing the filters to find your booking."
                  : "Your booking requests will appear here once you create one."}
            </p>
            {!total && (
              <Link className="button button-dark" href="/customer/bookings/new">
                Create a booking
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

      {cancellationBooking && (
        <CancellationDialog
          bookingId={cancellationBooking.id}
          bookingNumber={cancellationBooking.bookingNumber}
          onClose={() => setCancellationBooking(null)}
        />
      )}
    </section>
  );
}

function CancellationDialog({
  bookingId,
  bookingNumber,
  onClose,
}: {
  bookingId: string;
  bookingNumber: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await requestBookingCancellation(bookingId, reason);
      if (!result.success) {
        setError(result.message);
        return;
      }
      onClose();
      router.refresh();
    } catch (actionError) {
      console.error("Could not request booking cancellation.", actionError);
      setError("Your cancellation request could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="admin-modal-backdrop customer-cancellation-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        aria-labelledby="customer-cancellation-title"
        aria-modal="true"
        className="admin-modal customer-cancellation-modal"
        role="dialog"
      >
        <div className="admin-modal-heading">
          <div>
            <p className="eyebrow">Booking {bookingNumber}</p>
            <h2 id="customer-cancellation-title">Request cancellation</h2>
          </div>
          <button
            aria-label="Close cancellation request"
            className="admin-modal-close"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <p className="customer-cancellation-help">
          Your booking will remain active while the team reviews your request.
        </p>
        <form className="admin-user-edit-form admin-booking-form" onSubmit={submit}>
          <label>
            Cancellation reason
            <textarea
              autoFocus
              maxLength={2000}
              onChange={(event) => setReason(event.target.value)}
              required
              value={reason}
            />
          </label>
          {error && (
            <p className="admin-directory-error" role="alert">
              {error}
            </p>
          )}
          <div className="admin-modal-actions">
            <button
              className="admin-modal-secondary"
              disabled={busy}
              onClick={onClose}
              type="button"
            >
              Keep booking
            </button>
            <button className="button button-dark" disabled={busy} type="submit">
              {busy ? "Sending request…" : "Send request"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function CustomerCancellationAction({
  bookingId,
  bookingNumber,
  status,
  pendingRequest,
}: {
  bookingId: string;
  bookingNumber: string;
  status: BookingStatusValue;
  pendingRequest: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  if (pendingRequest) {
    return (
      <p className="customer-booking-request-status">
        A cancellation request is awaiting review.
      </p>
    );
  }
  if (!canRequestCancellation(status)) {
    return null;
  }
  return (
    <>
      <button
        className="admin-directory-action"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Request cancellation
      </button>
      {isOpen && (
        <CancellationDialog
          bookingId={bookingId}
          bookingNumber={bookingNumber}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
