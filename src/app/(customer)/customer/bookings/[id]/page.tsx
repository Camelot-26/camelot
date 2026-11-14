import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerBookingLoading } from "@/components/customer/customer-booking-loading";
import { CustomerCancellationAction } from "@/components/customer/customer-bookings";
import { getCustomerBookingUser } from "@/lib/customer-booking";
import { getPrisma } from "@/lib/prisma";

type RouteParams = Promise<{ id: string }>;

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export default function CustomerBookingDetailsPage({
  params,
}: {
  params: RouteParams;
}) {
  return (
    <Suspense
      fallback={
        <CustomerBookingLoading message="Loading booking details…" />
      }
    >
      <CustomerBookingDetailsContent params={params} />
    </Suspense>
  );
}

async function CustomerBookingDetailsContent({
  params,
}: {
  params: RouteParams;
}) {
  const customer = await getCustomerBookingUser();
  if (!customer) {
    redirect("/login?role=customer");
  }
  const { id } = await params;
  const booking = await getPrisma().booking.findFirst({
    where: {
      id,
      customerId: customer.id,
      deletedAt: null,
    },
    select: {
      id: true,
      bookingNumber: true,
      bookingDate: true,
      bookingTime: true,
      bookingType: true,
      adults: true,
      children: true,
      occasion: true,
      specialRequests: true,
      additionalNotes: true,
      status: true,
      createdAt: true,
      statusHistory: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          previousStatus: true,
          newStatus: true,
          createdAt: true,
        },
      },
      cancellationRequests: {
        where: { customerId: customer.id },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          status: true,
          reason: true,
          createdAt: true,
        },
      },
    },
  });

  if (!booking) {
    notFound();
  }

  const cancellationRequest = booking.cancellationRequests[0] ?? null;

  return (
    <section className="admin-bookings-page customer-bookings-page">
      <header className="admin-bookings-header">
        <div>
          <p className="eyebrow">Booking details</p>
          <h1>{booking.bookingNumber}</h1>
          <p>Review your booking and its status history.</p>
        </div>
        <Link className="admin-modal-secondary" href="/customer/bookings">
          Back to my bookings
        </Link>
      </header>

      <div className="admin-booking-detail-sections customer-booking-detail">
        <section className="admin-bookings-panel">
          <div className="customer-booking-detail-heading">
            <h2>Booking information</h2>
            <span
              className={`booking-status booking-status-${booking.status.toLowerCase().replaceAll("_", "-")}`}
            >
              {formatStatus(booking.status)}
            </span>
          </div>
          <dl className="admin-booking-details">
            <div>
              <dt>Booking ID</dt>
              <dd>{booking.bookingNumber}</dd>
            </div>
            <div>
              <dt>Booking date and time</dt>
              <dd>
                {formatDate(booking.bookingDate)} · {booking.bookingTime}
              </dd>
            </div>
            <div>
              <dt>Booking type</dt>
              <dd>{booking.bookingType}</dd>
            </div>
            <div>
              <dt>Guest count</dt>
              <dd>
                {booking.adults + booking.children} total ({booking.adults}{" "}
                adult{booking.adults === 1 ? "" : "s"}
                {booking.children
                  ? `, ${booking.children} child${booking.children === 1 ? "" : "ren"}`
                  : ""}
                )
              </dd>
            </div>
            <div>
              <dt>Occasion</dt>
              <dd>{booking.occasion || "—"}</dd>
            </div>
            <div>
              <dt>Special requests</dt>
              <dd className="customer-booking-long-value">
                {booking.specialRequests || "No special requests"}
              </dd>
            </div>
            <div>
              <dt>Additional notes</dt>
              <dd className="customer-booking-long-value">
                {booking.additionalNotes || "—"}
              </dd>
            </div>
            <div>
              <dt>Created date</dt>
              <dd>{formatDate(booking.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <section className="admin-bookings-panel customer-booking-history">
          <h2>Booking history</h2>
          {booking.statusHistory.length ? (
            <ol>
              {booking.statusHistory.map((entry) => (
                <li key={entry.id}>
                  <span
                    className={`booking-status booking-status-${entry.newStatus.toLowerCase().replaceAll("_", "-")}`}
                  >
                    {formatStatus(entry.newStatus)}
                  </span>
                  <time dateTime={entry.createdAt.toISOString()}>
                    {formatDate(entry.createdAt)}
                  </time>
                  {entry.previousStatus && (
                    <span>
                      Changed from {formatStatus(entry.previousStatus)}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p>There is no status history for this booking yet.</p>
          )}
        </section>

        <section className="admin-bookings-panel customer-cancellation-panel">
          <h2>Cancellation</h2>
          {cancellationRequest && (
            <div className="customer-booking-cancellation-request">
              <p>
                Request status:{" "}
                <strong>{formatStatus(cancellationRequest.status)}</strong>
              </p>
              <p>Reason: {cancellationRequest.reason}</p>
            </div>
          )}
          <CustomerCancellationAction
            bookingId={booking.id}
            bookingNumber={booking.bookingNumber}
            pendingRequest={cancellationRequest?.status === "PENDING"}
            status={booking.status}
          />
        </section>
      </div>
    </section>
  );
}
