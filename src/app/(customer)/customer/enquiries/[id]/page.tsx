import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerEnquiryConversation } from "@/components/customer/customer-enquiry-conversation";
import { CustomerEnquiryLoading } from "@/components/customer/customer-enquiry-loading";
import { customerEnquiryTypes } from "@/lib/enquiry-constants";
import { getCustomerBookingUser } from "@/lib/customer-booking";
import { getPrisma } from "@/lib/prisma";
import { parseCustomerEventRequest } from "@/lib/customer-event-requests";

type RouteParams = Promise<{ id: string }>;

function formatDateTime(value: Date) {
  return value.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function isCustomerVisibleMessageType(
  value: string,
): value is "CUSTOMER_MESSAGE" | "ADMIN_RESPONSE" {
  return value === "CUSTOMER_MESSAGE" || value === "ADMIN_RESPONSE";
}

export default function CustomerEnquiryDetailsPage({
  params,
}: {
  params: RouteParams;
}) {
  return (
    <Suspense
      fallback={
        <CustomerEnquiryLoading message="Loading enquiry details…" />
      }
    >
      <CustomerEnquiryDetailsContent params={params} />
    </Suspense>
  );
}

async function CustomerEnquiryDetailsContent({
  params,
}: {
  params: RouteParams;
}) {
  const customer = await getCustomerBookingUser();
  if (!customer) {
    redirect("/login?role=customer");
  }
  const { id } = await params;
  const eventRequest = await getPrisma().enquiry.findFirst({
    where: {
      id,
      customerId: customer.id,
      deletedAt: null,
      eventCategoryId: { not: null },
    },
    select: { description: true },
  });
  if (
    eventRequest &&
    parseCustomerEventRequest(eventRequest.description)
  ) {
    redirect(`/customer/events/${id}`);
  }
  const enquiry = await getPrisma().enquiry.findFirst({
    where: {
      id,
      customerId: customer.id,
      deletedAt: null,
    },
    select: {
      id: true,
      enquiryNumber: true,
      subject: true,
      enquiryType: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      convertedBooking: {
        select: {
          id: true,
          bookingNumber: true,
          customerId: true,
          deletedAt: true,
        },
      },
      events: {
        where: {
          customerId: customer.id,
          deletedAt: null,
        },
        select: {
          id: true,
          eventNumber: true,
          name: true,
        },
      },
      activities: {
        where: {
          activityType: {
            in: ["CUSTOMER_MESSAGE", "ADMIN_RESPONSE"],
          },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          activityType: true,
          description: true,
          createdAt: true,
        },
      },
    },
  });
  if (!enquiry) {
    notFound();
  }

  const relatedBooking =
    enquiry.convertedBooking?.customerId === customer.id &&
    enquiry.convertedBooking.deletedAt === null
      ? enquiry.convertedBooking
      : null;
  const typeLabel =
    customerEnquiryTypes.find((type) => type.value === enquiry.enquiryType)
      ?.label ?? enquiry.enquiryType;
  const messages = enquiry.activities
    .filter((activity) =>
      isCustomerVisibleMessageType(activity.activityType),
    )
    .map((activity) => ({
      id: activity.id,
      isCustomer: activity.activityType === "CUSTOMER_MESSAGE",
      description: activity.description,
      createdAt: activity.createdAt.toISOString(),
    }));

  return (
    <section className="admin-enquiries-page customer-enquiries-page">
      <header className="admin-enquiries-header">
        <div>
          <p className="eyebrow">Enquiry details</p>
          <h1>{enquiry.enquiryNumber}</h1>
          <p>{enquiry.subject}</p>
        </div>
        <Link className="admin-modal-secondary" href="/customer/enquiries">
          Back to my enquiries
        </Link>
      </header>

      <div className="customer-enquiry-detail-grid">
        <section className="admin-enquiries-panel customer-enquiry-information">
          <div className="customer-enquiry-status-heading">
            <h2>Enquiry information</h2>
            <span
              className={`enquiry-status enquiry-status-${enquiry.status.toLowerCase().replaceAll("_", "-")}`}
            >
              {statusLabel(enquiry.status)}
            </span>
          </div>
          <dl className="admin-booking-details">
            <div>
              <dt>Enquiry ID</dt>
              <dd>{enquiry.enquiryNumber}</dd>
            </div>
            <div>
              <dt>Subject</dt>
              <dd>{enquiry.subject}</dd>
            </div>
            <div>
              <dt>Enquiry type</dt>
              <dd>{typeLabel}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd className="customer-enquiry-description">
                {enquiry.description}
              </dd>
            </div>
            <div>
              <dt>Submitted date</dt>
              <dd>{formatDateTime(enquiry.createdAt)}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{formatDateTime(enquiry.updatedAt)}</dd>
            </div>
          </dl>
          {(relatedBooking || enquiry.events.length > 0) && (
            <section className="customer-enquiry-related">
              <h3>Related records</h3>
              {relatedBooking && (
                <p>
                  Booking:{" "}
                  <Link href={`/customer/bookings/${relatedBooking.id}`}>
                    {relatedBooking.bookingNumber}
                  </Link>
                </p>
              )}
              {enquiry.events.map((event) => (
                <p key={event.id}>
                  Event: {event.eventNumber} · {event.name}
                </p>
              ))}
            </section>
          )}
        </section>
        <CustomerEnquiryConversation
          enquiryId={enquiry.id}
          messages={messages}
          status={enquiry.status}
        />
      </div>
    </section>
  );
}
