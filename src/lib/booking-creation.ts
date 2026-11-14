import { randomUUID } from "node:crypto";
import { BookingStatus, type Prisma } from "@/generated/prisma/client";
import type { BookingTypeValue } from "@/lib/booking-constants";

export async function createBookingWithHistory(
  transaction: Prisma.TransactionClient,
  input: {
    customerId: string;
    bookingType: BookingTypeValue;
    bookingDate: Date;
    bookingTime: string;
    adults: number;
    children: number;
    occasion: string | null;
    specialRequests: string | null;
    additionalNotes: string | null;
    assignedAgentId: string | null;
    internalNotes: string | null;
    createdById: string;
    status: BookingStatus;
  },
) {
  const booking = await transaction.booking.create({
    data: {
      id: randomUUID(),
      bookingNumber: `BK-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
      ...input,
      assignedAt: input.assignedAgentId ? new Date() : null,
    },
  });
  await transaction.bookingStatusHistory.create({
    data: {
      id: randomUUID(),
      bookingId: booking.id,
      previousStatus: null,
      newStatus: input.status,
      updatedById: input.createdById,
    },
  });
  return booking;
}

export function getBookingTypeForEnquiry(enquiryType: string): BookingTypeValue {
  const normalized = enquiryType.toLowerCase();
  return normalized.includes("private") ||
    normalized.includes("event") ||
    normalized.includes("group")
    ? "Private dining"
    : "Dining";
}
