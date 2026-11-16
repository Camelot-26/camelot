import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerBookingUser } from "@/lib/customer-booking";
import { getPrisma } from "@/lib/prisma";

export default function CustomerDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="customer-dashboard" role="status">
          Loading your Camelot dashboard…
        </div>
      }
    >
      <CustomerDashboardContent />
    </Suspense>
  );
}

function formatBookingDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

async function CustomerDashboardContent() {
  const customer = await getCustomerBookingUser();
  if (!customer) redirect("/login?role=customer");

  const prisma = getPrisma();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const [bookingCount, enquiryCount, eventCount, nextBooking] =
    await Promise.all([
      prisma.booking.count({
        where: { customerId: customer.id, deletedAt: null },
      }),
      prisma.enquiry.count({
        where: { customerId: customer.id, deletedAt: null },
      }),
      prisma.event.count({
        where: { customerId: customer.id, deletedAt: null },
      }),
      prisma.booking.findFirst({
        where: {
          customerId: customer.id,
          deletedAt: null,
          bookingDate: { gte: today },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        orderBy: [{ bookingDate: "asc" }, { bookingTime: "asc" }],
        select: {
          bookingNumber: true,
          bookingDate: true,
          bookingTime: true,
          bookingType: true,
          adults: true,
          children: true,
          status: true,
        },
      }),
    ]);
  const firstName = customer.name.trim().split(/\s+/)[0] || "there";

  return (
    <div className="customer-dashboard">
      <section aria-labelledby="customer-welcome-title" className="customer-welcome">
        <div className="customer-welcome-copy">
          <p className="eyebrow">YOUR CAMELOT EXPERIENCE</p>
          <h1 id="customer-welcome-title">
            Welcome back, <em>{firstName}.</em>
          </h1>
          <p>
            Make yourself at home. Your plans, reservations, and special
            moments are all in one place.
          </p>
          <Link className="customer-primary-link" href="/customer/bookings/new">
            Plan your next visit <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div aria-hidden="true" className="customer-welcome-note">
          <span>DINING · GATHERING · CELEBRATING</span>
          <strong>A little more<br />extraordinary.</strong>
        </div>
      </section>

      <section aria-label="Your Camelot activity" className="customer-stat-grid">
        <Link className="customer-stat-card" href="/customer/bookings">
          <span className="customer-stat-icon" aria-hidden="true">01</span>
          <span className="customer-stat-label">My bookings</span>
          <strong>{bookingCount}</strong>
          <span className="customer-stat-link">View your reservations <span aria-hidden="true">→</span></span>
        </Link>
        <Link className="customer-stat-card" href="/customer/enquiries">
          <span className="customer-stat-icon" aria-hidden="true">02</span>
          <span className="customer-stat-label">My enquiries</span>
          <strong>{enquiryCount}</strong>
          <span className="customer-stat-link">Follow your conversations <span aria-hidden="true">→</span></span>
        </Link>
        <Link className="customer-stat-card" href="/customer/events">
          <span className="customer-stat-icon" aria-hidden="true">03</span>
          <span className="customer-stat-label">My events</span>
          <strong>{eventCount}</strong>
          <span className="customer-stat-link">See your celebrations <span aria-hidden="true">→</span></span>
        </Link>
      </section>

      <section className="customer-dashboard-lower">
        <div aria-labelledby="customer-next-visit-title" className="customer-next-visit">
          <div className="customer-section-heading">
            <div>
              <p className="eyebrow">LOOKING AHEAD</p>
              <h2 id="customer-next-visit-title">Your next visit</h2>
            </div>
            <Link href="/customer/bookings">All bookings <span aria-hidden="true">↗</span></Link>
          </div>
          {nextBooking ? (
            <div className="customer-upcoming-booking">
              <div className="customer-booking-date">
                <span>{formatBookingDate(nextBooking.bookingDate)}</span>
                <strong>{nextBooking.bookingTime}</strong>
              </div>
              <div className="customer-booking-summary">
                <span className="customer-booking-status">{nextBooking.status === "CONFIRMED" ? "CONFIRMED" : "AWAITING CONFIRMATION"}</span>
                <h3>{nextBooking.bookingType}</h3>
                <p>
                  {nextBooking.adults + nextBooking.children}{" "}
                  {nextBooking.adults + nextBooking.children === 1 ? "guest" : "guests"}
                  {" · "}Booking {nextBooking.bookingNumber}
                </p>
              </div>
              <Link
                aria-label={`View booking ${nextBooking.bookingNumber}`}
                className="customer-booking-arrow"
                href="/customer/bookings"
              >
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          ) : (
            <div className="customer-empty-visit">
              <span aria-hidden="true">✦</span>
              <div>
                <h3>Your next memorable evening starts here.</h3>
                <p>You don’t have an upcoming reservation yet.</p>
              </div>
              <Link className="button button-dark" href="/customer/bookings/new">
                Make a booking
              </Link>
            </div>
          )}
        </div>

        <aside aria-labelledby="customer-shortcuts-title" className="customer-shortcuts">
          <p className="eyebrow">MAKE IT YOURS</p>
          <h2 id="customer-shortcuts-title">A few quick things</h2>
          <Link href="/customer/events/new">
            <span className="customer-shortcut-icon" aria-hidden="true">✦</span>
            <span><strong>Plan an event</strong><small>Bring your next gathering to Camelot.</small></span>
            <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/customer/enquiries/new">
            <span className="customer-shortcut-icon" aria-hidden="true">✉</span>
            <span><strong>Talk to our team</strong><small>We’re here to help with the details.</small></span>
            <span aria-hidden="true">↗</span>
          </Link>
          <Link href="/customer/profile">
            <span className="customer-shortcut-icon" aria-hidden="true">◉</span>
            <span><strong>Update your profile</strong><small>Keep your contact information current.</small></span>
            <span aria-hidden="true">↗</span>
          </Link>
        </aside>
      </section>
    </div>
  );
}
