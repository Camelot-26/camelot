"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { getAuth } from "@/lib/auth";
import { requireAdminPermission } from "@/lib/authorization";
import { createBookingWithHistory } from "@/lib/booking-creation";
import {
  bookingStatuses,
  type BookingActionResult,
  type BookingInput,
  type BookingStatusValue,
  type BookingTypeValue,
} from "@/lib/booking-constants";
import { validateBookingDetails } from "@/lib/booking-validation";
import { getPrisma } from "@/lib/prisma";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBookingStatus(value: unknown): value is BookingStatusValue {
  return (
    typeof value === "string" &&
    bookingStatuses.includes(value as BookingStatusValue)
  );
}

type ParsedBookingInput = Omit<BookingInput, "id" | "status"> & {
  id: string | undefined;
  status: BookingStatusValue;
};

function parseBookingInput(
  value: unknown,
): { error: string } | { input: ParsedBookingInput } {
  if (!isRecord(value)) {
    return { error: "Enter the required booking information." } as const;
  }
  const stringFields = [
    "customerId",
    "bookingType",
    "bookingDate",
    "bookingTime",
    "occasion",
    "specialRequests",
    "additionalNotes",
    "assignedAgentId",
    "internalNotes",
  ] as const;
  if (
    stringFields.some((field) => typeof value[field] !== "string") ||
    typeof value.adults !== "number" ||
    typeof value.children !== "number" ||
    !isBookingStatus(value.status) ||
    (value.id !== undefined && typeof value.id !== "string")
  ) {
    return { error: "Enter the required booking information." } as const;
  }

  const input = {
    id: value.id as string | undefined,
    customerId: (value.customerId as string).trim(),
    bookingType: (value.bookingType as string).trim(),
    bookingDate: value.bookingDate as string,
    bookingTime: value.bookingTime as string,
    adults: value.adults,
    children: value.children,
    occasion: (value.occasion as string).trim(),
    specialRequests: (value.specialRequests as string).trim(),
    additionalNotes: (value.additionalNotes as string).trim(),
    assignedAgentId: (value.assignedAgentId as string).trim(),
    internalNotes: (value.internalNotes as string).trim(),
    status: value.status,
  };

  if (!input.customerId || input.customerId.length > 128) {
    return { error: "Select a customer." } as const;
  }
  const validationError = validateBookingDetails(input);
  if (validationError) {
    return { error: validationError } as const;
  }
  if (input.internalNotes.length > 2000) {
    return { error: "Booking notes exceed the allowed length." } as const;
  }
  if (input.assignedAgentId.length > 128) {
    return { error: "Select a valid assigned agent." } as const;
  }
  if (input.id !== undefined && (!input.id || input.id.length > 128)) {
    return { error: "This booking could not be found." } as const;
  }

  return { input } as const;
}

async function getAdminActorId() {
  await requireAdminPermission("bookings.manage");
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) {
    return null;
  }
  return session.user.id;
}

function isKnownRequestError(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

export async function saveBooking(
  value: unknown,
): Promise<BookingActionResult> {
  const actorId = await getAdminActorId();
  if (!actorId) {
    return { success: false, message: "Your session expired. Sign in again." };
  }

  const parsed = parseBookingInput(value);
  if ("error" in parsed) {
    return { success: false, message: parsed.error };
  }
  const { input } = parsed;
  const prisma = getPrisma();

  const [customer, agent] = await Promise.all([
    prisma.user.findFirst({
      where: { id: input.customerId, role: "customer" },
      select: { id: true },
    }),
    input.assignedAgentId
      ? prisma.user.findFirst({
          where: { id: input.assignedAgentId, role: "agent" },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  if (!customer) {
    return { success: false, message: "Select an existing customer account." };
  }
  if (input.assignedAgentId && !agent) {
    return { success: false, message: "Select an existing Agent account." };
  }

  const data = {
    customerId: input.customerId,
    bookingType: input.bookingType,
    bookingDate: new Date(`${input.bookingDate}T00:00:00.000Z`),
    bookingTime: input.bookingTime,
    adults: input.adults,
    children: input.children,
    occasion: input.occasion || null,
    specialRequests: input.specialRequests || null,
    additionalNotes: input.additionalNotes || null,
    assignedAgentId: input.assignedAgentId || null,
    internalNotes: input.internalNotes || null,
    status: input.status,
  };

  try {
    if (!input.id) {
      await prisma.$transaction(async (transaction) => {
        const booking = await createBookingWithHistory(transaction, {
          ...data,
          bookingType: input.bookingType as BookingTypeValue,
          createdById: actorId,
          status: input.status,
        });
        return booking;
      });
    } else {
      const bookingId = input.id;
      await prisma.$transaction(
        async (transaction) => {
          const current = await transaction.booking.findFirst({
            where: { id: bookingId, deletedAt: null },
            select: { status: true, assignedAgentId: true },
          });
          if (!current) {
            throw new Error("BOOKING_NOT_FOUND");
          }

          await transaction.booking.update({
            where: { id: bookingId },
            data: {
              ...data,
              assignedAt: input.assignedAgentId
                ? current.assignedAgentId === input.assignedAgentId
                  ? undefined
                  : new Date()
                : null,
            },
          });
          if (current.status !== input.status) {
            await transaction.bookingStatusHistory.create({
              data: {
                id: randomUUID(),
                bookingId,
                previousStatus: current.status,
                newStatus: input.status,
                updatedById: actorId,
              },
            });
          }
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message === "BOOKING_NOT_FOUND") {
      return {
        success: false,
        message: "This booking no longer exists or has been deleted.",
      };
    }
    if (isKnownRequestError(error, "P2002")) {
      return {
        success: false,
        message: "A booking number conflict occurred. Please try again.",
      };
    }
    if (isKnownRequestError(error, "P2034")) {
      return {
        success: false,
        message: "This booking changed at the same time. Refresh and try again.",
      };
    }
    if (isKnownRequestError(error, "P2025")) {
      return {
        success: false,
        message: "This booking no longer exists or has been deleted.",
      };
    }
    if (isKnownRequestError(error, "P2003")) {
      return {
        success: false,
        message: "The selected customer or Agent is no longer available.",
      };
    }
    throw error;
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function deleteBooking(id: unknown): Promise<BookingActionResult> {
  const actorId = await getAdminActorId();
  if (!actorId) {
    return { success: false, message: "Your session expired. Sign in again." };
  }
  if (typeof id !== "string" || !id || id.length > 128) {
    return { success: false, message: "This booking could not be found." };
  }

  const result = await getPrisma().booking.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), updatedAt: new Date() },
  });
  if (!result.count) {
    return {
      success: false,
      message: "This booking no longer exists or has already been deleted.",
    };
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/dashboard");
  return { success: true };
}
