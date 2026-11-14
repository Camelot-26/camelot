import { AdminBookingManagement } from "@/components/admin/admin-booking-management";
import { bookingStatuses, bookingTypes } from "@/lib/booking-constants";
import { getPrisma } from "@/lib/prisma";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function validDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    return undefined;
  }
  return value;
}

function parsePage(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = firstValue(params.q)?.trim().slice(0, 120) ?? "";
  const statusValue = firstValue(params.status);
  const status =
    statusValue &&
    bookingStatuses.includes(statusValue as (typeof bookingStatuses)[number])
      ? statusValue as (typeof bookingStatuses)[number]
      : undefined;
  const bookingDate = validDate(firstValue(params.date));
  const bookingTypeValue = firstValue(params.type);
  const bookingType =
    bookingTypeValue &&
    bookingTypes.includes(bookingTypeValue as (typeof bookingTypes)[number])
      ? bookingTypeValue
      : undefined;
  const agentId = firstValue(params.agent)?.slice(0, 128);
  const sortValue = firstValue(params.sort);
  const sort = sortValue === "createdAt" ? "createdAt" : "bookingDate";
  const direction = firstValue(params.direction) === "asc" ? "asc" : "desc";
  const pageSizeValue = parsePage(firstValue(params.pageSize), 10);
  const pageSize = [10, 25, 50, 100].includes(pageSizeValue)
    ? pageSizeValue
    : 10;
  const requestedPage = parsePage(firstValue(params.page), 1);
  const where = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(bookingDate
      ? { bookingDate: new Date(`${bookingDate}T00:00:00.000Z`) }
      : {}),
    ...(bookingType ? { bookingType } : {}),
    ...(agentId ? { assignedAgentId: agentId } : {}),
    ...(query
      ? {
          OR: [
            { bookingNumber: { contains: query, mode: "insensitive" as const } },
            {
              customer: {
                name: { contains: query, mode: "insensitive" as const },
              },
            },
            {
              customer: {
                phone: { contains: query, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };
  const prisma = getPrisma();
  const [total, customers, agents] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.user.findMany({
      where: { role: "customer" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, phone: true },
    }),
    prisma.user.findMany({
      where: { role: "agent", banned: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const bookings = await prisma.booking.findMany({
    where,
    orderBy: [
      { [sort]: direction },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true },
      },
      assignedAgent: {
        select: { id: true, name: true, email: true },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { updatedBy: { select: { name: true } } },
      },
    },
  });

  return (
    <AdminBookingManagement
      agents={agents}
      bookings={bookings.map((booking) => ({
        ...booking,
        bookingDate: booking.bookingDate.toISOString().slice(0, 10),
        assignedAt: booking.assignedAt?.toISOString() ?? null,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
        statusHistory: booking.statusHistory.map((entry) => ({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
        })),
      }))}
      customers={customers}
      filters={{
        q: query,
        status: status ?? "",
        date: bookingDate ?? "",
        type: bookingType ?? "",
        agent: agentId ?? "",
        sort,
        direction,
        page,
        pageSize,
      }}
      pageCount={pageCount}
      total={total}
    />
  );
}
