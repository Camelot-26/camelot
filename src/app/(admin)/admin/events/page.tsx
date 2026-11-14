import { connection } from "next/server";
import { AdminEventManagement } from "@/components/admin/admin-event-management";
import { eventStatuses } from "@/lib/event-constants";
import { getPrisma } from "@/lib/prisma";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parseDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

function parseMonth(value: string | undefined, fallback: Date) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    if (month >= 1 && month <= 12) return new Date(Date.UTC(year, month - 1, 1));
  }
  return new Date(Date.UTC(fallback.getUTCFullYear(), fallback.getUTCMonth(), 1));
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();
  const params = await searchParams;
  const now = new Date();
  const query = firstValue(params.q)?.trim().slice(0, 120) ?? "";
  const categoryId = firstValue(params.category)?.slice(0, 128) ?? "";
  const statusValue = firstValue(params.status);
  const status = eventStatuses.find((value) => value === statusValue);
  const eventDate = parseDate(firstValue(params.date));
  const coordinatorId = firstValue(params.coordinator)?.slice(0, 128) ?? "";
  const venue = firstValue(params.venue)?.trim().slice(0, 120) ?? "";
  const sortValue = firstValue(params.sort);
  const sort = sortValue === "createdAt" ? "createdAt" : "eventDate";
  const direction = firstValue(params.direction) === "asc" ? "asc" : "desc";
  const mode = firstValue(params.view) === "calendar" ? "calendar" : "list";
  const calendarView = ["month", "week", "day"].includes(firstValue(params.calendarView) ?? "")
    ? firstValue(params.calendarView) as "month" | "week" | "day"
    : "month";
  const monthAnchor = parseMonth(firstValue(params.month), now);
  const dateAnchor = parseDate(firstValue(params.day)) ?? monthAnchor;
  const pageSizeValue = parsePage(firstValue(params.pageSize), 10);
  const pageSize = [10, 25, 50, 100].includes(pageSizeValue) ? pageSizeValue : 10;
  const requestedPage = parsePage(firstValue(params.page), 1);
  const filter = {
    deletedAt: null,
    ...(categoryId ? { categoryId } : {}),
    ...(status ? { status } : {}),
    ...(eventDate ? { eventDate } : {}),
    ...(coordinatorId ? { assignedCoordinatorId: coordinatorId } : {}),
    ...(venue ? { venue: { contains: venue, mode: "insensitive" as const } } : {}),
    ...(query
      ? {
          OR: [
            { eventNumber: { contains: query, mode: "insensitive" as const } },
            { name: { contains: query, mode: "insensitive" as const } },
            { customerName: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const prisma = getPrisma();
  const [total, categoryRows, categoryCounts, customers, staff, enquiries, bookings] = await Promise.all([
    prisma.event.count({ where: filter }),
    prisma.eventCategory.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }] }),
    prisma.event.groupBy({
      by: ["categoryId"],
      where: { deletedAt: null },
      _count: { id: true },
    }),
    prisma.user.findMany({
      where: { role: "customer", banned: false },
      orderBy: { name: "asc" },
      take: 500,
      select: { id: true, name: true, email: true, phone: true },
    }),
    prisma.user.findMany({
      where: { role: { in: ["admin", "agent"] }, banned: false },
      orderBy: { name: "asc" },
      take: 500,
      select: { id: true, name: true, email: true, role: true },
    }),
    prisma.enquiry.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { id: true, enquiryNumber: true, subject: true, customerName: true },
    }),
    prisma.booking.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { id: true, bookingNumber: true, customer: { select: { name: true } } },
    }),
  ]);
  const categories = categoryRows.map((category) => ({
    ...category,
    eventCount: categoryCounts.find((row) => row.categoryId === category.id)?._count.id ?? 0,
  }));
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const eventInclude = {
    category: true,
    customer: { select: { id: true, name: true, email: true, phone: true } },
    coordinator: { select: { id: true, name: true, email: true } },
    assignedAgent: { select: { id: true, name: true, email: true } },
    createdBy: { select: { name: true } },
    enquiry: { select: { id: true, enquiryNumber: true, subject: true } },
    booking: { select: { id: true, bookingNumber: true } },
    statusHistory: {
      orderBy: { createdAt: "asc" as const },
      include: { changedBy: { select: { name: true } } },
    },
    activities: {
      orderBy: { createdAt: "asc" as const },
      include: { createdBy: { select: { name: true } } },
    },
    assignmentHistory: {
      orderBy: { createdAt: "asc" as const },
      include: {
        previousCoordinator: { select: { name: true } },
        newCoordinator: { select: { name: true } },
        previousAgent: { select: { name: true } },
        newAgent: { select: { name: true } },
        changedBy: { select: { name: true } },
      },
    },
    checklist: {
      orderBy: [{ status: "asc" as const }, { dueDate: "asc" as const }, { createdAt: "asc" as const }],
      include: {
        assignedTo: { select: { id: true, name: true } },
        completedBy: { select: { name: true } },
      },
    },
  };
  const events = await prisma.event.findMany({
    where: filter,
    orderBy: [{ [sort]: direction }, { createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: eventInclude,
  });

  let calendarStart: Date;
  let calendarEnd: Date;
  if (calendarView === "day") {
    calendarStart = new Date(Date.UTC(dateAnchor.getUTCFullYear(), dateAnchor.getUTCMonth(), dateAnchor.getUTCDate()));
    calendarEnd = new Date(calendarStart.getTime() + 24 * 60 * 60 * 1000);
  } else if (calendarView === "week") {
    calendarStart = new Date(Date.UTC(dateAnchor.getUTCFullYear(), dateAnchor.getUTCMonth(), dateAnchor.getUTCDate()));
    const weekday = (calendarStart.getUTCDay() + 6) % 7;
    calendarStart.setUTCDate(calendarStart.getUTCDate() - weekday);
    calendarEnd = new Date(calendarStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else {
    calendarStart = monthAnchor;
    calendarEnd = new Date(Date.UTC(monthAnchor.getUTCFullYear(), monthAnchor.getUTCMonth() + 1, 1));
  }
  const calendarEvents = mode === "calendar"
    ? await prisma.event.findMany({
        where: {
          ...filter,
          eventDate: { gte: calendarStart, lt: calendarEnd },
        },
        orderBy: [{ eventDate: "asc" }, { startTime: "asc" }, { id: "asc" }],
        take: 500,
        select: {
          id: true,
          eventNumber: true,
          name: true,
          eventDate: true,
          setupStartTime: true,
          startTime: true,
          endTime: true,
          cleanupEndTime: true,
          venue: true,
          status: true,
          category: { select: { name: true } },
        },
      })
    : [];

  return (
    <AdminEventManagement
      agents={staff.filter((user) => user.role === "agent")}
      staff={staff}
      customers={customers}
      categories={categories}
      enquiries={enquiries}
      bookings={bookings}
      events={events.map((event) => ({
        ...event,
        eventDate: event.eventDate.toISOString().slice(0, 10),
        createdAt: event.createdAt.toISOString(),
        updatedAt: event.updatedAt.toISOString(),
        assignedAt: event.assignedAt?.toISOString() ?? null,
        statusHistory: event.statusHistory.map((entry) => ({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
        })),
        activities: event.activities.map((activity) => ({
          ...activity,
          createdAt: activity.createdAt.toISOString(),
        })),
        assignmentHistory: event.assignmentHistory.map((entry) => ({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
        })),
        checklist: event.checklist.map((task) => ({
          ...task,
          dueDate: task.dueDate?.toISOString().slice(0, 10) ?? null,
          completedAt: task.completedAt?.toISOString() ?? null,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
        })),
      }))}
      calendarEvents={calendarEvents.map((event) => ({
        ...event,
        eventDate: event.eventDate.toISOString().slice(0, 10),
      }))}
      filters={{
        q: query,
        category: categoryId,
        status: status ?? "",
        date: firstValue(params.date) ?? "",
        coordinator: coordinatorId,
        venue,
        sort,
        direction,
        page,
        pageSize,
        mode,
        calendarView,
        month: `${monthAnchor.getUTCFullYear()}-${String(monthAnchor.getUTCMonth() + 1).padStart(2, "0")}`,
        day: dateAnchor.toISOString().slice(0, 10),
      }}
      pageCount={pageCount}
      total={total}
    />
  );
}
