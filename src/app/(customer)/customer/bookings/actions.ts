"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { BookingCancellationRequestStatus, BookingStatus, Prisma } from "@/generated/prisma/client";
import { createBookingWithHistory } from "@/lib/booking-creation";
import type { BookingTypeValue } from "@/lib/booking-constants";
import { validateBookingDetails } from "@/lib/booking-validation";
import { getCustomerBookingUser } from "@/lib/customer-booking";
import { getPrisma } from "@/lib/prisma";

type CustomerBookingActionResult =
  | { success: true; bookingId: string; bookingNumber: string }
  | { success: false; message: string };

type CancellationActionResult =
  | { success: true }
  | { success: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRequestError(error: unknown, code: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

export async function createCustomerBooking(
  value: unknown,
): Promise<CustomerBookingActionResult> {
  const customer = await getCustomerBookingUser();
  if (!customer) {
    return { success: false, message: "Your session expired. Sign in again." };
  }
  if (
    !isRecord(value) ||
    typeof value.bookingType !== "string" ||
    typeof value.bookingDate !== "string" ||
    typeof value.bookingTime !== "string" ||
    typeof value.adults !== "number" ||
    typeof value.children !== "number" ||
    typeof value.occasion !== "string" ||
    typeof value.specialRequests !== "string" ||
    typeof value.additionalNotes !== "string"
  ) {
    return { success: false, message: "Enter the required booking information." };
  }

  const input = {
    bookingType: value.bookingType.trim(),
    bookingDate: value.bookingDate,
    bookingTime: value.bookingTime,
    adults: value.adults,
    children: value.children,
    occasion: value.occasion.trim(),
    specialRequests: value.specialRequests.trim(),
    additionalNotes: value.additionalNotes.trim(),
  };
  const validationError = validateBookingDetails(input);
  if (validationError) {
    return { success: false, message: validationError };
  }

  const prisma = getPrisma();
  try {
    const booking = await prisma.$transaction((transaction) =>
      createBookingWithHistory(transaction, {
        customerId: customer.id,
        bookingType: input.bookingType as BookingTypeValue,
        bookingDate: new Date(`${input.bookingDate}T00:00:00.000Z`),
        bookingTime: input.bookingTime,
        adults: input.adults,
        children: input.children,
        occasion: input.occasion || null,
        specialRequests: input.specialRequests || null,
        additionalNotes: input.additionalNotes || null,
        assignedAgentId: null,
        internalNotes: null,
        createdById: customer.id,
        status: BookingStatus.PENDING,
      }),
    );

    revalidatePath("/customer/bookings");
    revalidatePath("/admin/bookings");
    return {
      success: true,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
    };
  } catch (error) {
    if (isRequestError(error, "P2002")) {
      return {
        success: false,
        message: "A booking number conflict occurred. Please try again.",
      };
    }
    if (isRequestError(error, "P2034")) {
      return {
        success: false,
        message: "The booking changed at the same time. Please try again.",
      };
    }
    if (isRequestError(error, "P2003")) {
      return {
        success: false,
        message: "Your customer profile is no longer available.",
      };
    }
    throw error;
  }
}

export async function requestBookingCancellation(
  bookingId: unknown,
  reasonValue: unknown,
): Promise<CancellationActionResult> {
  const customer = await getCustomerBookingUser();
  if (!customer) {
    return { success: false, message: "Your session expired. Sign in again." };
  }
  if (typeof bookingId !== "string" || !bookingId || bookingId.length > 128) {
    return { success: false, message: "This booking could not be found." };
  }
  if (typeof reasonValue !== "string") {
    return { success: false, message: "Enter a cancellation reason." };
  }
  const reason = reasonValue.trim();
  if (!reason || reason.length > 2000) {
    return {
      success: false,
      message: "Enter a cancellation reason of up to 2,000 characters.",
    };
  }

  const prisma = getPrisma();
  try {
    const outcome = await prisma.$transaction(
      async (transaction) => {
        const booking = await transaction.booking.findFirst({
          where: {
            id: bookingId,
            customerId: customer.id,
            deletedAt: null,
          },
          select: { status: true },
        });
        if (!booking) {
          return "NOT_FOUND" as const;
        }
        if (
          booking.status === BookingStatus.CANCELLED ||
          booking.status === BookingStatus.COMPLETED ||
          booking.status === BookingStatus.REJECTED ||
          booking.status === BookingStatus.NO_SHOW
        ) {
          return "NOT_CANCELLABLE" as const;
        }

        const existingRequest =
          await transaction.bookingCancellationRequest.findFirst({
            where: {
              bookingId,
              customerId: customer.id,
              status: BookingCancellationRequestStatus.PENDING,
            },
            select: { id: true },
          });
        if (existingRequest) {
          return "ALREADY_REQUESTED" as const;
        }

        await transaction.bookingCancellationRequest.create({
          data: {
            id: randomUUID(),
            bookingId,
            customerId: customer.id,
            reason,
          },
        });
        return "CREATED" as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (outcome === "NOT_FOUND") {
      return { success: false, message: "This booking could not be found." };
    }
    if (outcome === "NOT_CANCELLABLE") {
      return {
        success: false,
        message: "A cancellation request is not available for this booking.",
      };
    }
    if (outcome === "ALREADY_REQUESTED") {
      return {
        success: false,
        message: "A cancellation request is already awaiting review.",
      };
    }

    revalidatePath("/customer/bookings");
    revalidatePath(`/customer/bookings/${bookingId}`);
    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error) {
    if (isRequestError(error, "P2034")) {
      return {
        success: false,
        message: "The booking changed at the same time. Please try again.",
      };
    }
    throw error;
  }
}
