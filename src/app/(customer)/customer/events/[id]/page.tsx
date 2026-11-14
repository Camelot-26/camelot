import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { CustomerEventDetail } from "@/components/customer/customer-event-detail";
import { CustomerEventLoading } from "@/components/customer/customer-event-loading";
import { getCustomerEventStatus } from "@/lib/customer-event-constants";
import { parseCustomerEventRequest } from "@/lib/customer-event-requests";
import { getCustomerBookingUser } from "@/lib/customer-booking";
import { getPrisma } from "@/lib/prisma";

type RouteParams = Promise<{ id: string }>;
const visibleActivityTypes = [
  "CUSTOMER_MESSAGE",
  "ADMIN_RESPONSE",
  "CUSTOMER_CANCELLATION_REQUEST",
];

export default function CustomerEventDetailsPage({
  params,
}: {
  params: RouteParams;
}) {
  return (
    <Suspense
      fallback={<CustomerEventLoading message="Loading event request details…" />}
    >
      <CustomerEventDetailsContent params={params} />
    </Suspense>
  );
}

async function CustomerEventDetailsContent({
  params,
}: {
  params: RouteParams;
}) {
  const customer = await getCustomerBookingUser();
  if (!customer) redirect("/login?role=customer");

  const { id } = await params;
  const request = await getPrisma().enquiry.findFirst({
    where: {
      id,
      customerId: customer.id,
      deletedAt: null,
      eventCategoryId: { not: null },
    },
    select: {
      id: true,
      enquiryNumber: true,
      subject: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      eventCategory: { select: { name: true } },
      events: {
        where: { customerId: customer.id, deletedAt: null },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: {
          id: true,
          eventNumber: true,
          name: true,
          eventDate: true,
          startTime: true,
          endTime: true,
          status: true,
          expectedGuests: true,
          venue: true,
          category: { select: { name: true } },
        },
      },
      activities: {
        where: { activityType: { in: visibleActivityTypes } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          activityType: true,
          description: true,
          createdAt: true,
        },
      },
    },
  });

  if (request) {
    const details = parseCustomerEventRequest(request.description);
    if (!details) notFound();
    const event = request.events[0] ?? null;
    const publicEvent =
      event &&
      ["CONFIRMED", "IN_PREPARATION", "READY", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(event.status)
        ? {
            eventNumber: event.eventNumber,
            name: event.name,
            categoryName: event.category.name,
            eventDate: event.eventDate.toISOString().slice(0, 10),
            startTime: event.startTime,
            endTime: event.endTime,
            venue: event.venue,
            status: event.status,
          }
        : null;
    const hasCancellationRequest = request.activities.some(
      (activity) => activity.activityType === "CUSTOMER_CANCELLATION_REQUEST",
    );
    const eventIsClosed =
      event?.status === "COMPLETED" || event?.status === "CANCELLED";
    const canReply =
      request.status !== "CLOSED" &&
      request.status !== "LOST" &&
      (request.status !== "CONVERTED" || !!event) &&
      !eventIsClosed;
    const canRequestCancellation =
      request.status !== "CLOSED" &&
      request.status !== "LOST" &&
      !eventIsClosed &&
      !hasCancellationRequest;

    return (
      <CustomerEventDetail
        canReply={canReply}
        canRequestCancellation={canRequestCancellation}
        categoryName={event?.category.name ?? request.eventCategory?.name ?? details.categoryName}
        event={publicEvent}
        eventDescription={details.eventDescription}
        eventName={event?.name ?? request.subject}
        eventRequestId={request.enquiryNumber}
        guestCount={{
          expected: event?.expectedGuests ?? details.expectedGuests,
          adults: details.adults,
          children: details.children,
        }}
        messages={request.activities.map((activity) => ({
          id: activity.id,
          type: activity.activityType,
          description: activity.description,
          createdAt: activity.createdAt.toISOString(),
        }))}
        recordId={request.id}
        request={{
          companyName: details.companyName,
          seatingArrangement: details.seatingArrangement,
          foodBeverageRequirements: details.foodBeverageRequirements,
          decorationRequirements: details.decorationRequirements,
          entertainmentRequirements: details.entertainmentRequirements,
          specialRequirements: details.specialRequirements,
          additionalNotes: details.additionalNotes,
          preferredDate: details.preferredDate,
          preferredStartTime: details.preferredStartTime,
          preferredEndTime: details.preferredEndTime,
        }}
        status={getCustomerEventStatus(event?.status ?? null, request.status)}
        submittedAt={request.createdAt.toISOString()}
      />
    );
  }

  const event = await getPrisma().event.findFirst({
    where: { id, customerId: customer.id, deletedAt: null },
    select: {
      id: true,
      eventNumber: true,
      name: true,
      description: true,
      eventDate: true,
      startTime: true,
      endTime: true,
      status: true,
      expectedGuests: true,
      adults: true,
      children: true,
      venue: true,
      venueRequirements: true,
      foodBeverageRequirements: true,
      decorationRequirements: true,
      entertainmentRequirements: true,
      additionalNotes: true,
      seatingArrangement: true,
      category: { select: { name: true } },
      createdAt: true,
      activities: {
        where: { activityType: { in: visibleActivityTypes } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          activityType: true,
          description: true,
          createdAt: true,
        },
      },
    },
  });
  if (!event) notFound();

  const publicEvent =
    ["CONFIRMED", "IN_PREPARATION", "READY", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(event.status)
      ? {
          eventNumber: event.eventNumber,
          name: event.name,
          categoryName: event.category.name,
          eventDate: event.eventDate.toISOString().slice(0, 10),
          startTime: event.startTime,
          endTime: event.endTime,
          venue: event.venue,
          status: event.status,
        }
      : null;
  const hasCancellationRequest = event.activities.some(
    (activity) => activity.activityType === "CUSTOMER_CANCELLATION_REQUEST",
  );

  return (
    <CustomerEventDetail
      canReply={!["COMPLETED", "CANCELLED"].includes(event.status)}
      canRequestCancellation={
        !["COMPLETED", "CANCELLED"].includes(event.status) &&
        !hasCancellationRequest
      }
      categoryName={event.category.name}
      event={publicEvent}
      eventDescription={event.description}
      eventName={event.name}
      eventRequestId={event.eventNumber}
      guestCount={{
        expected: event.expectedGuests,
        adults: event.adults,
        children: event.children,
      }}
      messages={event.activities.map((activity) => ({
        id: activity.id,
        type: activity.activityType,
        description: activity.description,
        createdAt: activity.createdAt.toISOString(),
      }))}
      recordId={event.id}
      request={{
        companyName: "",
        seatingArrangement: event.seatingArrangement ?? "",
        foodBeverageRequirements: event.foodBeverageRequirements ?? "",
        decorationRequirements: event.decorationRequirements ?? "",
        entertainmentRequirements: event.entertainmentRequirements ?? "",
        specialRequirements: event.venueRequirements ?? "",
        additionalNotes: event.additionalNotes ?? "",
        preferredDate: event.eventDate.toISOString().slice(0, 10),
        preferredStartTime: event.startTime,
        preferredEndTime: event.endTime,
      }}
      status={getCustomerEventStatus(event.status, null)}
      submittedAt={event.createdAt.toISOString()}
    />
  );
}
