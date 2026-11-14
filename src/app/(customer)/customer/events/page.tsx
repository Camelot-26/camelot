import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { CustomerEventLoading } from "@/components/customer/customer-event-loading";
import { CustomerEvents } from "@/components/customer/customer-events";
import {
  customerEventStatuses,
  getCustomerEventStatus,
  type CustomerEventStatus,
} from "@/lib/customer-event-constants";
import { parseCustomerEventRequest } from "@/lib/customer-event-requests";
import { getCustomerBookingUser } from "@/lib/customer-booking";
import { getPrisma } from "@/lib/prisma";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

function eventEnquiryStatusFilter(
  status: CustomerEventStatus,
  customerId: string,
): Prisma.EnquiryWhereInput {
  const activeEvent = {
    customerId,
    deletedAt: null,
  };
  const noActiveEvent = { none: activeEvent };
  const terminalEventStatuses = [
    "CONFIRMED",
    "IN_PREPARATION",
    "READY",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
  ] as const;
  switch (status) {
    case "REQUEST_SUBMITTED":
      return { status: "NEW", events: noActiveEvent };
    case "UNDER_REVIEW":
      return {
        OR: [
          {
            status: { in: ["OPEN", "IN_PROGRESS"] },
            events: noActiveEvent,
          },
          {
            status: {
              notIn: [
                "CONVERTED",
                "WAITING_FOR_CUSTOMER",
                "FOLLOW_UP_REQUIRED",
              ],
            },
            events: {
              some: {
                ...activeEvent,
                status: { in: ["DRAFT", "PENDING_APPROVAL"] },
              },
            },
          },
        ],
      };
    case "ADDITIONAL_INFORMATION_REQUIRED":
      return {
        status: "WAITING_FOR_CUSTOMER",
        events: {
          none: { ...activeEvent, status: { in: [...terminalEventStatuses] } },
        },
      };
    case "PROPOSAL_SHARED":
      return {
        status: "FOLLOW_UP_REQUIRED",
        events: {
          none: { ...activeEvent, status: { in: [...terminalEventStatuses] } },
        },
      };
    case "AWAITING_CUSTOMER_CONFIRMATION":
      return {
        status: "CONVERTED",
        events: {
          none: { ...activeEvent, status: { in: [...terminalEventStatuses] } },
        },
      };
    case "CONFIRMED":
      return {
        events: { some: { ...activeEvent, status: "CONFIRMED" } },
      };
    case "IN_PREPARATION":
      return {
        events: {
          some: {
            ...activeEvent,
            status: { in: ["IN_PREPARATION", "READY", "IN_PROGRESS"] },
          },
        },
      };
    case "COMPLETED":
      return {
        events: { some: { ...activeEvent, status: "COMPLETED" } },
      };
    case "CANCELLED":
      return {
        events: { some: { ...activeEvent, status: "CANCELLED" } },
      };
    case "NOT_AVAILABLE":
      return {
        status: { in: ["CLOSED", "LOST"] },
        events: noActiveEvent,
      };
  }
}

function standaloneEventStatusFilter(
  status: CustomerEventStatus,
): Prisma.EventWhereInput | null {
  switch (status) {
    case "UNDER_REVIEW":
      return { status: { in: ["DRAFT", "PENDING_APPROVAL"] } };
    case "CONFIRMED":
      return { status: "CONFIRMED" };
    case "IN_PREPARATION":
      return { status: { in: ["IN_PREPARATION", "READY", "IN_PROGRESS"] } };
    case "COMPLETED":
      return { status: "COMPLETED" };
    case "CANCELLED":
      return { status: "CANCELLED" };
    default:
      return null;
  }
}

export default function CustomerEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={<CustomerEventLoading message="Loading your events…" />}
    >
      <CustomerEventsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CustomerEventsContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const customer = await getCustomerBookingUser();
  if (!customer) redirect("/login?role=customer");

  const params = await searchParams;
  const query = firstValue(params.q)?.trim().slice(0, 120) ?? "";
  const categoryId = firstValue(params.category)?.slice(0, 128) ?? "";
  const statusValue = firstValue(params.status);
  const status = customerEventStatuses.find((value) => value === statusValue);
  const eventDate = parseDate(firstValue(params.date));
  const requestedPage = positiveInteger(firstValue(params.page), 1);
  const requestedPageSize = positiveInteger(firstValue(params.pageSize), 10);
  const pageSize = [10, 25, 50].includes(requestedPageSize)
    ? requestedPageSize
    : 10;

  const requestConditions: Prisma.EnquiryWhereInput[] = [
    {
      customerId: customer.id,
      eventCategoryId: { not: null },
      deletedAt: null,
    },
  ];
  if (categoryId) {
    requestConditions.push({
      OR: [
        { eventCategoryId: categoryId },
        {
          events: {
            some: {
              customerId: customer.id,
              deletedAt: null,
              categoryId,
            },
          },
        },
      ],
    });
  }
  if (eventDate) {
    requestConditions.push({
      OR: [
        { preferredEventDate: eventDate },
        {
          events: {
            some: {
              customerId: customer.id,
              deletedAt: null,
              eventDate,
            },
          },
        },
      ],
    });
  }
  if (query) {
    requestConditions.push({
      OR: [
        { enquiryNumber: { contains: query, mode: "insensitive" } },
        { subject: { contains: query, mode: "insensitive" } },
        {
          events: {
            some: {
              customerId: customer.id,
              deletedAt: null,
              name: { contains: query, mode: "insensitive" },
            },
          },
        },
      ],
    });
  }
  if (status) {
    requestConditions.push(eventEnquiryStatusFilter(status, customer.id));
  }
  const requestWhere: Prisma.EnquiryWhereInput = { AND: requestConditions };

  const eventConditions: Prisma.EventWhereInput[] = [
    {
      customerId: customer.id,
      deletedAt: null,
      OR: [
        { enquiryId: null },
        { enquiry: { is: { eventCategoryId: null } } },
        { enquiry: { is: { deletedAt: { not: null } } } },
      ],
    },
  ];
  if (categoryId) eventConditions.push({ categoryId });
  if (eventDate) eventConditions.push({ eventDate });
  if (query) {
    eventConditions.push({
      OR: [
        { eventNumber: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
      ],
    });
  }
  if (status) {
    eventConditions.push(
      standaloneEventStatusFilter(status) ?? { id: "__no_event_matches_status__" },
    );
  }
  const eventWhere: Prisma.EventWhereInput = { AND: eventConditions };

  const prisma = getPrisma();
  const [requestTotal, eventTotal, categories] = await Promise.all([
    prisma.enquiry.count({ where: requestWhere }),
    prisma.event.count({ where: eventWhere }),
    prisma.eventCategory.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
  ]);
  const total = requestTotal + eventTotal;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const take = page * pageSize;
  const [requests, events] = await Promise.all([
    prisma.enquiry.findMany({
      where: requestWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: {
        id: true,
        enquiryNumber: true,
        subject: true,
        description: true,
        status: true,
        createdAt: true,
        eventCategoryId: true,
        preferredEventDate: true,
        eventExpectedGuests: true,
        eventCategory: { select: { name: true } },
        activities: {
          where: { activityType: "CUSTOMER_CANCELLATION_REQUEST" },
          take: 1,
          select: { id: true },
        },
        events: {
          where: { customerId: customer.id, deletedAt: null },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            id: true,
            eventNumber: true,
            name: true,
            eventDate: true,
            status: true,
            expectedGuests: true,
            venue: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.event.findMany({
      where: eventWhere,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: {
        id: true,
        eventNumber: true,
        name: true,
        eventDate: true,
        status: true,
        expectedGuests: true,
        venue: true,
        createdAt: true,
        category: { select: { id: true, name: true } },
        activities: {
          where: { activityType: "CUSTOMER_CANCELLATION_REQUEST" },
          take: 1,
          select: { id: true },
        },
      },
    }),
  ]);

  const requestRows = requests.map((request) => {
    const details = parseCustomerEventRequest(request.description);
    const event = request.events[0] ?? null;
    const eventStatus = event?.status ?? null;
    return {
      id: request.id,
      requestId: request.enquiryNumber,
      eventName: event?.name ?? request.subject,
      categoryId: event?.category.id ?? request.eventCategoryId ?? "",
      categoryName: event?.category.name ?? request.eventCategory?.name ?? details?.categoryName ?? "Event",
      eventDate: (event?.eventDate ?? request.preferredEventDate)?.toISOString().slice(0, 10) ?? "",
      expectedGuests: event?.expectedGuests ?? request.eventExpectedGuests ?? details?.expectedGuests ?? 0,
      venue:
        event &&
        ["CONFIRMED", "IN_PREPARATION", "READY", "IN_PROGRESS", "COMPLETED"].includes(event.status)
          ? event.venue
          : null,
      status: getCustomerEventStatus(eventStatus, request.status),
      submittedAt: request.createdAt.toISOString(),
      pendingCancellationRequest: request.activities.length > 0,
    };
  });
  const eventRows = events.map((event) => ({
    id: event.id,
    requestId: event.eventNumber,
    eventName: event.name,
    categoryId: event.category.id,
    categoryName: event.category.name,
    eventDate: event.eventDate.toISOString().slice(0, 10),
    expectedGuests: event.expectedGuests,
    venue: ["CONFIRMED", "IN_PREPARATION", "READY", "IN_PROGRESS", "COMPLETED"].includes(event.status)
      ? event.venue
      : null,
    status: getCustomerEventStatus(event.status, null),
    submittedAt: event.createdAt.toISOString(),
    pendingCancellationRequest: event.activities.length > 0,
  }));
  const rows = [...requestRows, ...eventRows]
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id))
    .slice((page - 1) * pageSize, page * pageSize);

  return (
    <CustomerEvents
      categories={categories}
      events={rows}
      filters={{
        q: query,
        category: categoryId,
        status: status ?? "",
        date: firstValue(params.date) ?? "",
        page,
        pageSize,
      }}
      pageCount={pageCount}
      total={total}
    />
  );
}
