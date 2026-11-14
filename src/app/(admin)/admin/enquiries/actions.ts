"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { BookingStatus, EnquiryFollowupStatus, EnquiryStatus, Prisma } from "@/generated/prisma/client";
import { getBookingTypeForEnquiry, createBookingWithHistory } from "@/lib/booking-creation";
import { getAuth } from "@/lib/auth";
import { requireUserRole } from "@/lib/authorization";
import {
  enquiryPriorities,
  enquirySources,
  enquiryStatuses,
  type EnquiryActionResult,
  type EnquiryInput,
  type EnquiryPriorityValue,
  type EnquirySourceValue,
  type EnquiryStatusValue,
  type EnquiryTypeValue,
} from "@/lib/enquiry-constants";
import { validateEnquiryDetails } from "@/lib/enquiry-validation";
import { parseCustomerEventRequest } from "@/lib/customer-event-requests";
import { getPrisma } from "@/lib/prisma";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

function isRequestError(error: unknown, code: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

async function getAdminActorId() {
  await requireUserRole("admin");
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function addActivity(
  transaction: Prisma.TransactionClient,
  input: {
    enquiryId: string;
    activityType: string;
    description: string;
    createdById: string | null;
  },
) {
  return transaction.enquiryActivity.create({
    data: { id: randomUUID(), ...input },
  });
}

type ParsedEnquiry = Omit<EnquiryInput, "id" | "priority" | "status"> & {
  id: string | undefined;
  priority: EnquiryPriorityValue;
  status: EnquiryStatusValue;
  enquiryType: EnquiryTypeValue;
  source: EnquirySourceValue;
};

function parseEnquiry(value: unknown): { error: string } | { input: ParsedEnquiry } {
  if (!isRecord(value)) {
    return { error: "Enter the required enquiry information." };
  }
  const requiredStrings = [
    "customerId",
    "customerName",
    "customerEmail",
    "customerPhone",
    "subject",
    "enquiryType",
    "description",
    "source",
    "assignedAgentId",
    "internalNotes",
    "statusRemarks",
  ] as const;
  if (
    requiredStrings.some((key) => typeof value[key] !== "string") ||
    (value.id !== undefined && typeof value.id !== "string") ||
    typeof value.priority !== "string" ||
    typeof value.status !== "string"
  ) {
    return { error: "Enter the required enquiry information." };
  }
  const input = {
    id: value.id as string | undefined,
    customerId: (value.customerId as string).trim(),
    customerName: (value.customerName as string).trim(),
    customerEmail: (value.customerEmail as string).trim().toLowerCase(),
    customerPhone: (value.customerPhone as string).trim(),
    subject: (value.subject as string).trim(),
    enquiryType: (value.enquiryType as string).trim(),
    description: (value.description as string).trim(),
    source: (value.source as string).trim(),
    priority: value.priority as string,
    status: value.status as string,
    assignedAgentId: (value.assignedAgentId as string).trim(),
    internalNotes: (value.internalNotes as string).trim(),
    statusRemarks: (value.statusRemarks as string).trim(),
  };
  const detailsError = validateEnquiryDetails(input);
  if (detailsError) {
    return { error: detailsError };
  }
  if (!enquirySources.includes(input.source as EnquirySourceValue)) {
    return { error: "Select a valid enquiry source." };
  }
  if (!enquiryPriorities.includes(input.priority as EnquiryPriorityValue)) {
    return { error: "Select a valid enquiry priority." };
  }
  if (!enquiryStatuses.includes(input.status as EnquiryStatusValue)) {
    return { error: "Select a valid enquiry status." };
  }
  if (
    input.customerId.length > 128 ||
    input.assignedAgentId.length > 128 ||
    (input.id !== undefined && (!input.id || input.id.length > 128))
  ) {
    return { error: "The selected enquiry, customer, or Agent is invalid." };
  }
  if (!input.id && input.status === EnquiryStatus.CONVERTED) {
    return { error: "Use Convert to booking to convert an enquiry." };
  }
  if (input.internalNotes.length > 4000 || input.statusRemarks.length > 1000) {
    return { error: "Notes exceed the allowed length." };
  }
  return {
    input: {
      ...input,
      enquiryType: input.enquiryType as EnquiryTypeValue,
      source: input.source as EnquirySourceValue,
      priority: input.priority as EnquiryPriorityValue,
      status: input.status as EnquiryStatusValue,
    },
  };
}

export async function saveEnquiry(value: unknown): Promise<EnquiryActionResult> {
  const actorId = await getAdminActorId();
  if (!actorId) {
    return { success: false, message: "Your session expired. Sign in again." };
  }
  const parsed = parseEnquiry(value);
  if ("error" in parsed) return { success: false, message: parsed.error };
  const { input } = parsed;
  const prisma = getPrisma();

  const [customer, agent] = await Promise.all([
    input.customerId
      ? prisma.user.findFirst({
          where: { id: input.customerId, role: "customer" },
          select: { id: true },
        })
      : Promise.resolve(null),
    input.assignedAgentId
      ? prisma.user.findFirst({
          where: { id: input.assignedAgentId, role: "agent", banned: false },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  if (input.customerId && !customer) {
    return { success: false, message: "Select an existing customer account." };
  }
  if (input.assignedAgentId && !agent) {
    return { success: false, message: "Select an active Agent account." };
  }

  const data = {
    customerId: input.customerId || null,
    customerName: input.customerName,
    customerEmail: input.customerEmail || null,
    customerPhone: input.customerPhone || null,
    subject: input.subject,
    enquiryType: input.enquiryType,
    description: input.description,
    source: input.source,
    priority: input.priority,
    status: input.status,
    assignedAgentId: input.assignedAgentId || null,
    internalNotes: input.internalNotes || null,
  };

  try {
    const result = await prisma.$transaction(
      async (transaction) => {
        if (!input.id) {
          const enquiryNumber = `EN-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
          const enquiry = await transaction.enquiry.create({
            data: {
              id: randomUUID(),
              enquiryNumber,
              ...data,
              assignedById: input.assignedAgentId ? actorId : null,
              assignedAt: input.assignedAgentId ? new Date() : null,
              createdById: actorId,
            },
          });
          await transaction.enquiryStatusHistory.create({
            data: {
              id: randomUUID(),
              enquiryId: enquiry.id,
              previousStatus: null,
              newStatus: input.status,
              remarks: input.statusRemarks || null,
              changedById: actorId,
            },
          });
          await addActivity(transaction, {
            enquiryId: enquiry.id,
            activityType: "CREATED",
            description: `Enquiry created as ${input.status.toLowerCase().replaceAll("_", " ")}.`,
            createdById: actorId,
          });
          if (input.assignedAgentId) {
            await addActivity(transaction, {
              enquiryId: enquiry.id,
              activityType: "AGENT_ASSIGNED",
              description: "An Agent was assigned when the enquiry was created.",
              createdById: actorId,
            });
          }
          if (input.internalNotes) {
            await addActivity(transaction, {
              enquiryId: enquiry.id,
              activityType: "INTERNAL_NOTE",
              description: `Internal note added: ${input.internalNotes}`,
              createdById: actorId,
            });
          }
          return enquiry.enquiryNumber;
        }

        const current = await transaction.enquiry.findFirst({
          where: { id: input.id, deletedAt: null },
          select: {
            status: true,
            priority: true,
            assignedAgentId: true,
            internalNotes: true,
            convertedBookingId: true,
            subject: true,
            description: true,
            events: { select: { id: true }, take: 1 },
          },
        });
        if (!current) throw new Error("ENQUIRY_NOT_FOUND");
        const isEventRequest = parseCustomerEventRequest(current.description) !== null;
        if (
          isEventRequest &&
          (input.description !== current.description ||
            input.subject !== current.subject)
        ) {
          throw new Error("EVENT_REQUEST_DETAILS_LOCKED");
        }
        if (
          current.status === EnquiryStatus.CONVERTED &&
          input.status !== EnquiryStatus.CONVERTED &&
          !isEventRequest
        ) {
          throw new Error("CONVERTED_ENQUIRY_STATUS_LOCKED");
        }
        if (
          input.status === EnquiryStatus.CONVERTED &&
          !current.convertedBookingId &&
          !(isEventRequest && current.events.length > 0)
        ) {
          throw new Error("CONVERSION_REQUIRED");
        }
        await transaction.enquiry.update({
          where: { id: input.id },
          data: {
            ...data,
            assignedById:
              current.assignedAgentId === (input.assignedAgentId || null)
                ? undefined
                : input.assignedAgentId
                  ? actorId
                  : null,
            assignedAt:
              current.assignedAgentId === (input.assignedAgentId || null)
                ? undefined
                : input.assignedAgentId
                  ? new Date()
                  : null,
          },
        });
        if (current.status !== input.status) {
          await transaction.enquiryStatusHistory.create({
            data: {
              id: randomUUID(),
              enquiryId: input.id,
              previousStatus: current.status,
              newStatus: input.status,
              remarks: input.statusRemarks || null,
              changedById: actorId,
            },
          });
          await addActivity(transaction, {
            enquiryId: input.id,
            activityType: "STATUS_CHANGED",
            description: `Status changed from ${current.status.toLowerCase().replaceAll("_", " ")} to ${input.status.toLowerCase().replaceAll("_", " ")}${input.statusRemarks ? `: ${input.statusRemarks}` : "."}`,
            createdById: actorId,
          });
        }
        if (current.priority !== input.priority) {
          await addActivity(transaction, {
            enquiryId: input.id!,
            activityType: "PRIORITY_CHANGED",
            description: `Priority changed from ${current.priority.toLowerCase()} to ${input.priority.toLowerCase()}.`,
            createdById: actorId,
          });
        }
        if (current.assignedAgentId !== (input.assignedAgentId || null)) {
          await addActivity(transaction, {
            enquiryId: input.id!,
            activityType: "AGENT_ASSIGNED",
            description: input.assignedAgentId
              ? "An Agent was assigned to the enquiry."
              : "The assigned Agent was removed.",
            createdById: actorId,
          });
        }
        if (current.internalNotes !== (input.internalNotes || null)) {
          await addActivity(transaction, {
            enquiryId: input.id!,
            activityType: "INTERNAL_NOTE",
            description: input.internalNotes
              ? `Internal note added: ${input.internalNotes}`
              : "Internal notes were cleared.",
            createdById: actorId,
          });
        }
        return null;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    revalidatePath("/admin/enquiries");
    return { success: true, ...(result ? { enquiryNumber: result } : {}) };
  } catch (error) {
    if (error instanceof Error && error.message === "ENQUIRY_NOT_FOUND") {
      return { success: false, message: "This enquiry no longer exists." };
    }
    if (error instanceof Error && error.message === "CONVERTED_ENQUIRY_STATUS_LOCKED") {
      return { success: false, message: "A converted enquiry cannot be reopened." };
    }
    if (error instanceof Error && error.message === "CONVERSION_REQUIRED") {
      return { success: false, message: "An enquiry must be converted before using this status." };
    }
    if (error instanceof Error && error.message === "EVENT_REQUEST_DETAILS_LOCKED") {
      return {
        success: false,
        message: "Event request details are read-only here; update scheduling through Event Management.",
      };
    }
    if (isRequestError(error, "P2034")) {
      return { success: false, message: "This enquiry changed at the same time. Refresh and try again." };
    }
    throw error;
  }
}

export async function replyToCustomerEnquiry(
  value: unknown,
): Promise<EnquiryActionResult> {
  const actorId = await getAdminActorId();
  if (!actorId) {
    return { success: false, message: "Your session expired. Sign in again." };
  }
  if (
    !isRecord(value) ||
    typeof value.enquiryId !== "string" ||
    !value.enquiryId ||
    value.enquiryId.length > 128 ||
    typeof value.message !== "string"
  ) {
    return { success: false, message: "Enter a response." };
  }
  const message = value.message.trim();
  if (!message || message.length > 10000) {
    return {
      success: false,
      message: "Enter a response of up to 10,000 characters.",
    };
  }

  const prisma = getPrisma();
  try {
    const enquiryId = value.enquiryId;
    await prisma.$transaction(async (transaction) => {
      const enquiry = await transaction.enquiry.findFirst({
        where: { id: enquiryId, deletedAt: null },
        select: { id: true, description: true },
      });
      if (!enquiry) {
        throw new Error("ENQUIRY_NOT_FOUND");
      }

      await transaction.enquiryActivity.create({
        data: {
          id: randomUUID(),
          enquiryId: enquiry.id,
          activityType: "ADMIN_RESPONSE",
          description: message,
          createdById: actorId,
        },
      });
      if (parseCustomerEventRequest(enquiry.description)) {
        const events = await transaction.event.findMany({
          where: {
            enquiryId: enquiry.id,
            deletedAt: null,
          },
          select: { id: true },
        });
        await Promise.all(
          events.map((event) =>
            transaction.eventActivity.create({
              data: {
                id: randomUUID(),
                eventId: event.id,
                activityType: "ADMIN_RESPONSE",
                description: message,
                createdById: actorId,
              },
            }),
          ),
        );
      }
      await transaction.enquiry.update({
        where: { id: enquiry.id },
        data: { updatedAt: new Date() },
      });
    });

    revalidatePath("/admin/enquiries");
    revalidatePath("/customer/enquiries");
    revalidatePath(`/customer/enquiries/${enquiryId}`);
    revalidatePath("/customer/events");
    revalidatePath(`/customer/events/${enquiryId}`);
    revalidatePath("/admin/events");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "ENQUIRY_NOT_FOUND") {
      return { success: false, message: "This enquiry no longer exists." };
    }
    if (isRequestError(error, "P2003")) {
      return { success: false, message: "This enquiry is no longer available." };
    }
    throw error;
  }
}

export async function deleteEnquiry(id: unknown): Promise<EnquiryActionResult> {
  const actorId = await getAdminActorId();
  if (!actorId) return { success: false, message: "Your session expired. Sign in again." };
  if (typeof id !== "string" || !id || id.length > 128) {
    return { success: false, message: "This enquiry could not be found." };
  }
  const result = await getPrisma().enquiry.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), updatedAt: new Date() },
  });
  if (!result.count) {
    return { success: false, message: "This enquiry no longer exists or was deleted." };
  }
  revalidatePath("/admin/enquiries");
  return { success: true };
}

export async function scheduleFollowup(
  value: unknown,
): Promise<EnquiryActionResult> {
  const actorId = await getAdminActorId();
  if (!actorId) return { success: false, message: "Your session expired. Sign in again." };
  if (!isRecord(value) || typeof value.enquiryId !== "string" ||
      typeof value.date !== "string" || typeof value.time !== "string" ||
      typeof value.notes !== "string" ||
      (value.replaceFollowupId !== undefined && typeof value.replaceFollowupId !== "string")) {
    return { success: false, message: "Enter a valid follow-up date." };
  }
  const date = validDate(value.date);
  if (!date || (value.time && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.time))) {
    return { success: false, message: "Enter a valid follow-up date and time." };
  }
  const notes = value.notes.trim();
  if (notes.length > 2000) return { success: false, message: "Follow-up notes must be 2,000 characters or less." };
  const enquiryId = value.enquiryId;
  const scheduledTime = value.time;
  try {
    await getPrisma().$transaction(async (transaction) => {
      const enquiry = await transaction.enquiry.findFirst({
        where: { id: enquiryId, deletedAt: null },
        select: { id: true },
      });
      if (!enquiry) throw new Error("ENQUIRY_NOT_FOUND");
      if (value.replaceFollowupId) {
        const old = await transaction.enquiryFollowup.findFirst({
          where: {
            id: value.replaceFollowupId,
            enquiryId,
            status: EnquiryFollowupStatus.SCHEDULED,
          },
          select: { id: true },
        });
        if (!old) throw new Error("FOLLOWUP_NOT_FOUND");
        await transaction.enquiryFollowup.update({
          where: { id: old.id },
          data: { status: EnquiryFollowupStatus.CANCELLED },
        });
      }
      const followup = await transaction.enquiryFollowup.create({
        data: {
          id: randomUUID(),
          enquiryId,
          scheduledDate: date,
          scheduledTime: scheduledTime || null,
          notes: notes || null,
          createdById: actorId,
        },
      });
      const next = await transaction.enquiryFollowup.findFirst({
        where: {
          enquiryId,
          status: EnquiryFollowupStatus.SCHEDULED,
        },
        orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
        select: { scheduledDate: true, scheduledTime: true },
      });
      await transaction.enquiry.update({
        where: { id: enquiryId },
        data: {
          nextFollowUpAt: next
            ? new Date(`${next.scheduledDate.toISOString().slice(0, 10)}T${next.scheduledTime ?? "00:00"}:00.000Z`)
            : null,
        },
      });
      await addActivity(transaction, {
        enquiryId,
        activityType: value.replaceFollowupId ? "FOLLOWUP_RESCHEDULED" : "FOLLOWUP_SCHEDULED",
        description: `Follow-up scheduled for ${value.date}${scheduledTime ? ` at ${scheduledTime}` : ""}${notes ? `: ${notes}` : "."}`,
        createdById: actorId,
      });
      return followup.id;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ENQUIRY_NOT_FOUND") {
      return { success: false, message: "This enquiry no longer exists." };
    }
    if (error instanceof Error && error.message === "FOLLOWUP_NOT_FOUND") {
      return { success: false, message: "That follow-up is no longer scheduled." };
    }
    throw error;
  }
  revalidatePath("/admin/enquiries");
  return { success: true };
}

export async function completeFollowup(
  value: unknown,
): Promise<EnquiryActionResult> {
  const actorId = await getAdminActorId();
  if (!actorId) return { success: false, message: "Your session expired. Sign in again." };
  if (!isRecord(value) || typeof value.enquiryId !== "string" ||
      typeof value.followupId !== "string" ||
      (value.notes !== undefined && typeof value.notes !== "string")) {
    return { success: false, message: "This follow-up could not be found." };
  }
  const notes = typeof value.notes === "string" ? value.notes.trim() : "";
  if (notes.length > 2000) return { success: false, message: "Follow-up notes must be 2,000 characters or less." };
  try {
    await getPrisma().$transaction(async (transaction) => {
      const followup = await transaction.enquiryFollowup.findFirst({
        where: {
          id: value.followupId as string,
          enquiryId: value.enquiryId as string,
          status: EnquiryFollowupStatus.SCHEDULED,
        },
      });
      if (!followup) throw new Error("FOLLOWUP_NOT_FOUND");
      await transaction.enquiryFollowup.update({
        where: { id: followup.id },
        data: {
          status: EnquiryFollowupStatus.COMPLETED,
          completedAt: new Date(),
          notes: notes || followup.notes,
        },
      });
      const next = await transaction.enquiryFollowup.findFirst({
        where: {
          enquiryId: value.enquiryId as string,
          status: EnquiryFollowupStatus.SCHEDULED,
          id: { not: followup.id },
        },
        orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
        select: { scheduledDate: true, scheduledTime: true },
      });
      await transaction.enquiry.update({
        where: { id: value.enquiryId as string },
        data: {
          nextFollowUpAt: next
            ? new Date(`${next.scheduledDate.toISOString().slice(0, 10)}T${next.scheduledTime ?? "00:00"}:00.000Z`)
            : null,
        },
      });
      await addActivity(transaction, {
        enquiryId: value.enquiryId as string,
        activityType: "FOLLOWUP_COMPLETED",
        description: `Follow-up completed${notes ? `: ${notes}` : "."}`,
        createdById: actorId,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FOLLOWUP_NOT_FOUND") {
      return { success: false, message: "That follow-up is no longer scheduled." };
    }
    throw error;
  }
  revalidatePath("/admin/enquiries");
  return { success: true };
}

export async function convertEnquiryToBooking(
  value: unknown,
): Promise<EnquiryActionResult> {
  const actorId = await getAdminActorId();
  if (!actorId) return { success: false, message: "Your session expired. Sign in again." };
  if (!isRecord(value) ||
      typeof value.enquiryId !== "string" ||
      typeof value.customerId !== "string" ||
      typeof value.bookingDate !== "string" ||
      typeof value.bookingTime !== "string" ||
      typeof value.adults !== "number" ||
      typeof value.children !== "number" ||
      typeof value.assignedAgentId !== "string" ||
      typeof value.occasion !== "string") {
    return { success: false, message: "Enter the required booking information." };
  }
  const bookingDate = validDate(value.bookingDate);
  if (!bookingDate || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.bookingTime)) {
    return { success: false, message: "Enter a valid booking date and time." };
  }
  if (!value.customerId || value.customerId.length > 128 ||
      !Number.isSafeInteger(value.adults) || value.adults < 1 ||
      !Number.isSafeInteger(value.children) || value.children < 0 ||
      !Number.isSafeInteger(value.adults + value.children)) {
    return { success: false, message: "Select a customer and enter a valid guest count." };
  }
  if (value.assignedAgentId.length > 128 || value.occasion.length > 100) {
    return { success: false, message: "The booking information is invalid." };
  }
  try {
    const bookingNumber = await getPrisma().$transaction(
      async (transaction) => {
        const enquiry = await transaction.enquiry.findFirst({
          where: { id: value.enquiryId as string, deletedAt: null },
          include: { convertedBooking: { select: { bookingNumber: true } } },
        });
        if (!enquiry) throw new Error("ENQUIRY_NOT_FOUND");
        if (parseCustomerEventRequest(enquiry.description)) {
          throw new Error("EVENT_REQUEST_REQUIRES_EVENT");
        }
        if (enquiry.convertedBooking) {
          throw new Error(`ALREADY_CONVERTED:${enquiry.convertedBooking.bookingNumber}`);
        }
        if (
          enquiry.status === EnquiryStatus.CLOSED ||
          enquiry.status === EnquiryStatus.LOST ||
          enquiry.status === EnquiryStatus.CONVERTED
        ) {
          throw new Error("ENQUIRY_NOT_ELIGIBLE");
        }

        const customer = await transaction.user.findFirst({
          where: { id: value.customerId as string, role: "customer" },
          select: { id: true },
        });
        if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
        const assignedAgentId = value.assignedAgentId as string;
        if (assignedAgentId) {
          const agent = await transaction.user.findFirst({
            where: { id: assignedAgentId, role: "agent", banned: false },
            select: { id: true },
          });
          if (!agent) throw new Error("AGENT_NOT_FOUND");
        }
        const booking = await createBookingWithHistory(transaction, {
          customerId: customer.id,
          bookingType: getBookingTypeForEnquiry(enquiry.enquiryType),
          bookingDate,
          bookingTime: value.bookingTime as string,
          adults: value.adults as number,
          children: value.children as number,
          occasion: (value.occasion as string).trim() || null,
          specialRequests: `Converted from ${enquiry.enquiryNumber}: ${enquiry.subject}\n\n${enquiry.description}`,
          additionalNotes: null,
          assignedAgentId: assignedAgentId || null,
          internalNotes: enquiry.internalNotes,
          createdById: actorId,
          status: BookingStatus.PENDING,
        });
        await transaction.enquiry.update({
          where: { id: enquiry.id },
          data: {
            customerId: customer.id,
            convertedBookingId: booking.id,
            status: EnquiryStatus.CONVERTED,
            updatedAt: new Date(),
          },
        });
        await transaction.enquiryStatusHistory.create({
          data: {
            id: randomUUID(),
            enquiryId: enquiry.id,
            previousStatus: enquiry.status,
            newStatus: EnquiryStatus.CONVERTED,
            remarks: `Converted to booking ${booking.bookingNumber}.`,
            changedById: actorId,
          },
        });
        await addActivity(transaction, {
          enquiryId: enquiry.id,
          activityType: "CONVERTED",
          description: `Converted to booking ${booking.bookingNumber}.`,
          createdById: actorId,
        });
        return booking.bookingNumber;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    revalidatePath("/admin/enquiries");
    revalidatePath("/admin/bookings");
    return { success: true, bookingNumber };
  } catch (error) {
    if (error instanceof Error && error.message === "ENQUIRY_NOT_FOUND") {
      return { success: false, message: "This enquiry no longer exists." };
    }
    if (error instanceof Error && error.message.startsWith("ALREADY_CONVERTED:")) {
      return {
        success: false,
        message: `This enquiry was already converted to ${error.message.slice("ALREADY_CONVERTED:".length)}.`,
      };
    }
    if (error instanceof Error && error.message === "ENQUIRY_NOT_ELIGIBLE") {
      return { success: false, message: "Closed or lost enquiries cannot be converted." };
    }
    if (error instanceof Error && error.message === "EVENT_REQUEST_REQUIRES_EVENT") {
      return {
        success: false,
        message: "Event requests must be converted through Event Management, not to a booking.",
      };
    }
    if (error instanceof Error && error.message === "CUSTOMER_NOT_FOUND") {
      return { success: false, message: "Select an existing customer account before converting." };
    }
    if (error instanceof Error && error.message === "AGENT_NOT_FOUND") {
      return { success: false, message: "Select an active Agent account." };
    }
    if (isRequestError(error, "P2002")) {
      return { success: false, message: "This enquiry was converted already. Refresh to see the booking." };
    }
    if (isRequestError(error, "P2034")) {
      return { success: false, message: "This enquiry changed at the same time. Refresh and try again." };
    }
    throw error;
  }
}
