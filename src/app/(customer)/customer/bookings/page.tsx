import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CustomerBookingLoading } from "@/components/customer/customer-booking-loading";
import { CustomerBookings } from "@/components/customer/customer-bookings";
import { bookingStatuses, type BookingStatusValue } from "@/lib/booking-constants";
import { getCustomerBookingUser } from "@/lib/customer-booking";
import { getPrisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function validDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
    ? value
    : undefined;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export default function CustomerBookingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={<CustomerBookingLoading message="Loading your bookings…" />}
    >
      <CustomerBookingsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CustomerBookingsContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const customer = await getCustomerBookingUser();
  if (!customer) {
    redirect("/login?role=customer");
  }

  const params = await searchParams;
  const query = firstValue(params.q)?.trim().slice(0, 120) ?? "";
  const statusValue = firstValue(params.status);
  const status =
    statusValue &&
    bookingStatuses.includes(statusValue as BookingStatusValue)
      ? (statusValue as BookingStatusValue)
      : undefined;
  const bookingDate = validDate(firstValue(params.date));
  const requestedPage = positiveInteger(firstValue(params.page), 1);
  const requestedPageSize = positiveInteger(firstValue(params.pageSize), 10);
  const pageSize = [10, 25, 50].includes(requestedPageSize)
    ? requestedPageSize
    : 10;

  const where: Prisma.BookingWhereInput = {
    customerId: customer.id,
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(bookingDate
      ? { bookingDate: new Date(`${bookingDate}T00:00:00.000Z`) }
      : {}),
    ...(query
      ? {
          OR: [
            { bookingNumber: { contains: query, mode: "insensitive" } },
            { id: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const prisma = getPrisma();
  const total = await prisma.booking.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const bookings = await prisma.booking.findMany({
    where,
    orderBy: [{ bookingDate: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      bookingNumber: true,
      bookingDate: true,
      bookingTime: true,
      bookingType: true,
      adults: true,
      children: true,
      status: true,
      createdAt: true,
      cancellationRequests: {
        where: {
          customerId: customer.id,
          status: "PENDING",
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  return (
    <CustomerBookings
      bookings={bookings.map((booking) => ({
        ...booking,
        bookingDate: booking.bookingDate.toISOString().slice(0, 10),
        createdAt: booking.createdAt.toISOString(),
        hasPendingCancellationRequest: booking.cancellationRequests.length > 0,
      }))}
      filters={{
        q: query,
        status: status ?? "",
        date: bookingDate ?? "",
        page,
        pageSize,
      }}
      pageCount={pageCount}
      total={total}
    />
  );
}
