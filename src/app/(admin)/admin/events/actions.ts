"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  EnquiryStatus,
  EventStatus,
  EventTaskStatus,
  Prisma,
} from "@/generated/prisma/client";
import {
  parseCustomerEventRequest,
} from "@/lib/customer-event-requests";
import { getAuth } from "@/lib/auth";
import { requireAdminPermission } from "@/lib/authorization";
import {
  eventStatuses,
  eventTaskPriorities,
  eventTaskStatuses,
  type EventActionResult,
  type EventInput,
  type EventStatusValue,
  type EventTaskPriorityValue,
  type EventTaskStatusValue,
} from "@/lib/event-constants";
import { getPrisma } from "@/lib/prisma";

const transitions: Record<EventStatusValue, EventStatusValue[]> = {
  DRAFT: ["PENDING_APPROVAL", "CONFIRMED", "CANCELLED"],
  PENDING_APPROVAL: ["DRAFT", "CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PREPARATION", "CANCELLED"],
  IN_PREPARATION: ["READY", "CANCELLED"],
  READY: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

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

function validTime(value: string) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isRequestError(error: unknown, code: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

async function getAdminActorId() {
  await requireAdminPermission("events.manage");
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

function addActivity(
  transaction: Prisma.TransactionClient,
  input: {
    eventId: string;
    activityType: string;
    description: string;
    createdById: string;
  },
) {
  return transaction.eventActivity.create({
    data: { id: randomUUID(), ...input },
  });
}

function parseEvent(value: unknown): { error: string } | { input: EventInput } {
  if (!isRecord(value)) return { error: "Enter the required event information." };
  const stringKeys = [
    "name",
    "categoryId",
    "description",
    "eventDate",
    "setupStartTime",
    "startTime",
    "endTime",
    "cleanupEndTime",
    "status",
    "coverImage",
    "customerId",
    "customerName",
    "contactNumber",
    "emailAddress",
    "companyName",
    "occasion",
    "seatingArrangement",
    "venue",
    "venueRequirements",
    "foodBeverageRequirements",
    "decorationRequirements",
    "entertainmentRequirements",
    "additionalNotes",
    "assignedCoordinatorId",
    "assignedAgentId",
    "internalNotes",
    "enquiryId",
    "bookingId",
    "statusRemarks",
  ] as const;
  if (
    stringKeys.some((key) => typeof value[key] !== "string") ||
    (value.id !== undefined && typeof value.id !== "string") ||
    typeof value.expectedGuests !== "number" ||
    typeof value.adults !== "number" ||
    typeof value.children !== "number" ||
    (value.venueCapacity !== null && typeof value.venueCapacity !== "number") ||
    typeof value.status !== "string"
  ) {
    return { error: "Enter the required event information." };
  }
  const input = {
    id: value.id as string | undefined,
    name: (value.name as string).trim(),
    categoryId: (value.categoryId as string).trim(),
    description: (value.description as string).trim(),
    eventDate: value.eventDate as string,
    setupStartTime: value.setupStartTime as string,
    startTime: value.startTime as string,
    endTime: value.endTime as string,
    cleanupEndTime: value.cleanupEndTime as string,
    status: value.status as EventStatusValue,
    coverImage: (value.coverImage as string).trim(),
    customerId: (value.customerId as string).trim(),
    customerName: (value.customerName as string).trim(),
    contactNumber: (value.contactNumber as string).trim(),
    emailAddress: (value.emailAddress as string).trim().toLowerCase(),
    companyName: (value.companyName as string).trim(),
    expectedGuests: value.expectedGuests,
    adults: value.adults,
    children: value.children,
    occasion: (value.occasion as string).trim(),
    seatingArrangement: (value.seatingArrangement as string).trim(),
    venue: (value.venue as string).trim(),
    venueCapacity: value.venueCapacity as number | null,
    venueRequirements: (value.venueRequirements as string).trim(),
    foodBeverageRequirements: (value.foodBeverageRequirements as string).trim(),
    decorationRequirements: (value.decorationRequirements as string).trim(),
    entertainmentRequirements: (value.entertainmentRequirements as string).trim(),
    additionalNotes: (value.additionalNotes as string).trim(),
    assignedCoordinatorId: (value.assignedCoordinatorId as string).trim(),
    assignedAgentId: (value.assignedAgentId as string).trim(),
    internalNotes: (value.internalNotes as string).trim(),
    enquiryId: (value.enquiryId as string).trim(),
    bookingId: (value.bookingId as string).trim(),
    statusRemarks: (value.statusRemarks as string).trim(),
  };
  const eventDate = validDate(input.eventDate);
  if (!input.name || input.name.length > 180) {
    return { error: "Enter an event name (maximum 180 characters)." };
  }
  if (!input.categoryId || input.categoryId.length > 128) {
    return { error: "Select an event category." };
  }
  if (!input.description || input.description.length > 10000) {
    return { error: "Enter an event description (maximum 10,000 characters)." };
  }
  if (!eventDate) return { error: "Enter a valid event date." };
  if (
    !validTime(input.setupStartTime) ||
    !validTime(input.startTime) ||
    !validTime(input.endTime) ||
    !validTime(input.cleanupEndTime) ||
    input.setupStartTime > input.startTime ||
    input.startTime >= input.endTime ||
    input.endTime > input.cleanupEndTime
  ) {
    return { error: "Schedule times must be valid and ordered from setup through cleanup." };
  }
  if (!eventStatuses.includes(input.status)) {
    return { error: "Select a valid event status." };
  }
  if (!input.customerName || input.customerName.length > 120) {
    return { error: "Enter an organizer name (maximum 120 characters)." };
  }
  if (!input.contactNumber || input.contactNumber.length > 40) {
    return { error: "Enter a valid contact number (maximum 40 characters)." };
  }
  if (
    input.emailAddress &&
    (input.emailAddress.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.emailAddress))
  ) {
    return { error: "Enter a valid email address." };
  }
  if (
    !Number.isSafeInteger(input.expectedGuests) ||
    input.expectedGuests < 1 ||
    !Number.isSafeInteger(input.adults) ||
    input.adults < 0 ||
    !Number.isSafeInteger(input.children) ||
    input.children < 0 ||
    input.adults + input.children !== input.expectedGuests ||
    (input.venueCapacity !== null &&
      (!Number.isSafeInteger(input.venueCapacity) || input.venueCapacity < 1))
  ) {
    return { error: "Guest counts must be valid and match the expected total." };
  }
  if (!input.venue || input.venue.length > 120) {
    return { error: "Enter a venue or area (maximum 120 characters)." };
  }
  if (
    [input.customerId, input.assignedCoordinatorId, input.assignedAgentId,
      input.enquiryId, input.bookingId].some((id) => id.length > 128) ||
    (input.id !== undefined && (!input.id || input.id.length > 128))
  ) {
    return { error: "One of the selected records is invalid." };
  }
  const textFields = [
    input.coverImage, input.companyName, input.occasion, input.seatingArrangement,
    input.venueRequirements, input.foodBeverageRequirements,
    input.decorationRequirements, input.entertainmentRequirements,
    input.additionalNotes, input.internalNotes, input.statusRemarks,
  ];
  if (textFields.some((field) => field.length > 5000)) {
    return { error: "Event details exceed the allowed length." };
  }
  return { input };
}

function scheduleConflict(
  existing: { setupStartTime: string; cleanupEndTime: string },
  input: EventInput,
) {
  return (
    input.setupStartTime < existing.cleanupEndTime &&
    existing.setupStartTime < input.cleanupEndTime
  );
}

export async function saveEvent(value: unknown): Promise<EventActionResult> {
  const actorId = await getAdminActorId();
  if (!actorId) return { success: false, message: "Your session expired. Sign in again." };
  const parsed = parseEvent(value);
  if ("error" in parsed) return { success: false, message: parsed.error };
  const { input } = parsed;
  const prisma = getPrisma();
  const [category, customer, coordinator, agent, enquiry, booking] = await Promise.all([
    prisma.eventCategory.findFirst({
      where: { id: input.categoryId, ...(input.id ? {} : { isActive: true }) },
      select: { id: true },
    }),
    input.customerId
      ? prisma.user.findFirst({
          where: { id: input.customerId, role: "customer", banned: false },
          select: { id: true },
        })
      : Promise.resolve(null),
    input.assignedCoordinatorId
      ? prisma.user.findFirst({
          where: { id: input.assignedCoordinatorId, role: { in: ["admin", "agent"] }, banned: false },
          select: { id: true },
        })
      : Promise.resolve(null),
    input.assignedAgentId
      ? prisma.user.findFirst({
          where: { id: input.assignedAgentId, role: "agent", banned: false },
          select: { id: true },
        })
      : Promise.resolve(null),
    input.enquiryId
      ? prisma.enquiry.findFirst({
          where: { id: input.enquiryId, deletedAt: null },
          select: { id: true, customerId: true, description: true },
        })
      : Promise.resolve(null),
    input.bookingId
      ? prisma.booking.findFirst({ where: { id: input.bookingId, deletedAt: null }, select: { id: true } })
      : Promise.resolve(null),
  ]);
  if (!category) return { success: false, message: "Select an active event category." };
  if (input.customerId && !customer) return { success: false, message: "Select an existing customer account." };
  if (input.assignedCoordinatorId && !coordinator) return { success: false, message: "Select a valid event coordinator." };
  if (input.assignedAgentId && !agent) return { success: false, message: "Select an active Agent account." };
  if (input.enquiryId && !enquiry) return { success: false, message: "Select an active enquiry." };
  if (
    enquiry &&
    parseCustomerEventRequest(enquiry.description) &&
    enquiry.customerId !== input.customerId
  ) {
    return {
      success: false,
      message: "Keep the customer linked to this event request.",
    };
  }
  if (input.bookingId && !booking) return { success: false, message: "Select an active booking." };

  const data = {
    name: input.name,
    categoryId: input.categoryId,
    description: input.description,
    eventDate: validDate(input.eventDate)!,
    setupStartTime: input.setupStartTime,
    startTime: input.startTime,
    endTime: input.endTime,
    cleanupEndTime: input.cleanupEndTime,
    status: input.status,
    coverImage: input.coverImage || null,
    customerId: input.customerId || null,
    customerName: input.customerName,
    contactNumber: input.contactNumber,
    emailAddress: input.emailAddress || null,
    companyName: input.companyName || null,
    expectedGuests: input.expectedGuests,
    adults: input.adults,
    children: input.children,
    occasion: input.occasion || null,
    seatingArrangement: input.seatingArrangement || null,
    venue: input.venue,
    venueCapacity: input.venueCapacity,
    venueRequirements: input.venueRequirements || null,
    foodBeverageRequirements: input.foodBeverageRequirements || null,
    decorationRequirements: input.decorationRequirements || null,
    entertainmentRequirements: input.entertainmentRequirements || null,
    additionalNotes: input.additionalNotes || null,
    assignedCoordinatorId: input.assignedCoordinatorId || null,
    assignedAgentId: input.assignedAgentId || null,
    internalNotes: input.internalNotes || null,
    enquiryId: input.enquiryId || null,
    bookingId: input.bookingId || null,
  };

  try {
    const eventNumber = await prisma.$transaction(
      async (tx) => {
        const eventId = input.id ?? randomUUID();
        const current = input.id
          ? await tx.event.findFirst({
              where: { id: eventId, deletedAt: null },
              select: {
                eventNumber: true,
                status: true,
                assignedCoordinatorId: true,
                assignedAgentId: true,
                eventDate: true,
                setupStartTime: true,
                startTime: true,
                endTime: true,
                cleanupEndTime: true,
                venue: true,
                internalNotes: true,
              },
            })
          : null;
        if (input.id && !current) throw new Error("EVENT_NOT_FOUND");
        if (input.enquiryId) {
          const linkedEvent = await tx.event.findFirst({
            where: {
              enquiryId: input.enquiryId,
              ...(current ? { id: { not: eventId } } : {}),
            },
            select: { eventNumber: true },
          });
          if (linkedEvent) throw new Error("ENQUIRY_ALREADY_HAS_EVENT");
        }
        if (current && current.status !== input.status &&
            !transitions[current.status].includes(input.status)) {
          throw new Error("INVALID_EVENT_TRANSITION");
        }
        const activeInitialStatuses: EventStatus[] = [
          EventStatus.IN_PREPARATION,
          EventStatus.READY,
          EventStatus.IN_PROGRESS,
          EventStatus.COMPLETED,
        ];
        if (!current && activeInitialStatuses.includes(input.status)) {
          throw new Error("INVALID_INITIAL_EVENT_STATUS");
        }
        if (
          input.status === EventStatus.CONFIRMED ||
          input.status === EventStatus.IN_PREPARATION ||
          input.status === EventStatus.READY ||
          input.status === EventStatus.IN_PROGRESS
        ) {
          const candidates = await tx.event.findMany({
            where: {
              id: { not: eventId },
              deletedAt: null,
              venue: { equals: input.venue, mode: "insensitive" },
              eventDate: data.eventDate,
              status: { in: [EventStatus.CONFIRMED, EventStatus.IN_PREPARATION, EventStatus.READY, EventStatus.IN_PROGRESS] },
            },
            select: { setupStartTime: true, cleanupEndTime: true },
          });
          if (candidates.some((candidate) => scheduleConflict(candidate, input))) {
            throw new Error("EVENT_SCHEDULE_CONFLICT");
          }
          if (input.venueCapacity !== null && input.expectedGuests > input.venueCapacity) {
            throw new Error("EVENT_CAPACITY_EXCEEDED");
          }
        }
        const assignedAt = input.assignedCoordinatorId || input.assignedAgentId
          ? current?.assignedCoordinatorId === (input.assignedCoordinatorId || null) &&
            current?.assignedAgentId === (input.assignedAgentId || null)
            ? undefined
            : new Date()
          : null;
        const event = current
          ? await tx.event.update({
              where: { id: eventId },
              data: { ...data, assignedById: assignedAt ? actorId : undefined, assignedAt },
            })
          : await tx.event.create({
              data: {
                id: eventId,
                eventNumber: `EVT-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
                ...data,
                assignedById: input.assignedCoordinatorId || input.assignedAgentId ? actorId : null,
                assignedAt: input.assignedCoordinatorId || input.assignedAgentId ? new Date() : null,
                createdById: actorId,
              },
            });
        if (!current) {
          await tx.eventStatusHistory.create({
            data: {
              id: randomUUID(),
              eventId,
              previousStatus: null,
              newStatus: input.status,
              remarks: input.statusRemarks || null,
              changedById: actorId,
            },
          });
          if (input.assignedCoordinatorId || input.assignedAgentId) {
            await tx.eventAssignmentHistory.create({
              data: {
                id: randomUUID(),
                eventId,
                newCoordinatorId: input.assignedCoordinatorId || null,
                newAgentId: input.assignedAgentId || null,
                changedById: actorId,
              },
            });
          }
          await addActivity(tx, {
            eventId,
            activityType: "CREATED",
            description: `Event created as ${input.status.toLowerCase().replaceAll("_", " ")}.`,
            createdById: actorId,
          });
          if (input.assignedCoordinatorId || input.assignedAgentId) {
            await addActivity(tx, {
              eventId,
              activityType: "ASSIGNMENT_CHANGED",
              description: "Coordinator or Agent assigned when the event was created.",
              createdById: actorId,
            });
          }
        } else {
          if (current.status !== input.status) {
            await tx.eventStatusHistory.create({
              data: {
                id: randomUUID(),
                eventId,
                previousStatus: current.status,
                newStatus: input.status,
                remarks: input.statusRemarks || null,
                changedById: actorId,
              },
            });
            await addActivity(tx, {
              eventId,
              activityType: "STATUS_CHANGED",
              description: `Status changed from ${current.status.toLowerCase().replaceAll("_", " ")} to ${input.status.toLowerCase().replaceAll("_", " ")}${input.statusRemarks ? `: ${input.statusRemarks}` : "."}`,
              createdById: actorId,
            });
          }
          if (
            current.assignedCoordinatorId !== (input.assignedCoordinatorId || null) ||
            current.assignedAgentId !== (input.assignedAgentId || null)
          ) {
            await tx.eventAssignmentHistory.create({
              data: {
                id: randomUUID(),
                eventId,
                previousCoordinatorId: current.assignedCoordinatorId,
                newCoordinatorId: input.assignedCoordinatorId || null,
                previousAgentId: current.assignedAgentId,
                newAgentId: input.assignedAgentId || null,
                changedById: actorId,
              },
            });
            await addActivity(tx, {
              eventId,
              activityType: "ASSIGNMENT_CHANGED",
              description: "Event coordinator or Agent assignment changed.",
              createdById: actorId,
            });
          }
          if (
            current.eventDate.toISOString().slice(0, 10) !== input.eventDate ||
            current.setupStartTime !== input.setupStartTime ||
            current.startTime !== input.startTime ||
            current.endTime !== input.endTime ||
            current.cleanupEndTime !== input.cleanupEndTime ||
            current.venue !== input.venue
          ) {
            await addActivity(tx, {
              eventId,
              activityType: "SCHEDULE_CHANGED",
              description: `Event schedule or venue updated to ${input.eventDate}, ${input.startTime}–${input.endTime} at ${input.venue}.`,
              createdById: actorId,
            });
          }
          if (current.internalNotes !== (input.internalNotes || null)) {
            await addActivity(tx, {
              eventId,
              activityType: "INTERNAL_NOTE",
              description: input.internalNotes ? "Internal notes updated." : "Internal notes cleared.",
              createdById: actorId,
            });
          }
          await addActivity(tx, {
            eventId,
            activityType: "UPDATED",
            description: "Event details updated.",
            createdById: actorId,
          });
        }
        return event.eventNumber;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    revalidatePath("/admin/events");
    return { success: true, eventNumber };
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        EVENT_NOT_FOUND: "This event no longer exists.",
        ENQUIRY_ALREADY_HAS_EVENT: "This enquiry is already linked to an event.",
        INVALID_EVENT_TRANSITION: "That event status transition is not allowed.",
        INVALID_INITIAL_EVENT_STATUS: "New events cannot start in an active or completed status.",
        EVENT_SCHEDULE_CONFLICT: "This venue already has a scheduled event during that setup-to-cleanup window.",
        EVENT_CAPACITY_EXCEEDED: "Expected guests exceed the venue capacity.",
      };
      if (messages[error.message]) return { success: false, message: messages[error.message] };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(error.code)) {
      return {
        success: false,
        message: error.code === "P2034"
          ? "This event changed at the same time. Refresh and try again."
          : "An event with that identifier already exists.",
      };
    }
    throw error;
  }
}

export async function convertCustomerEventRequest(
  value: unknown,
): Promise<EventActionResult> {
  const actorId = await getAdminActorId();
  if (!actorId) {
    return { success: false, message: "Your session expired. Sign in again." };
  }
  if (
    !isRecord(value) ||
    typeof value.enquiryId !== "string" ||
    typeof value.categoryId !== "string" ||
    typeof value.eventDate !== "string" ||
    typeof value.setupStartTime !== "string" ||
    typeof value.startTime !== "string" ||
    typeof value.endTime !== "string" ||
    typeof value.cleanupEndTime !== "string" ||
    typeof value.venue !== "string" ||
    typeof value.contactNumber !== "string" ||
    (value.venueCapacity !== null && typeof value.venueCapacity !== "number")
  ) {
    return { success: false, message: "Enter the required event schedule." };
  }
  const enquiryId = value.enquiryId.trim();
  const categoryId = value.categoryId.trim();
  const eventDate = validDate(value.eventDate);
  const setupStartTime = value.setupStartTime;
  const startTime = value.startTime;
  const endTime = value.endTime;
  const cleanupEndTime = value.cleanupEndTime;
  const venue = value.venue.trim();
  const contactNumber = value.contactNumber.trim();
  const venueCapacity = value.venueCapacity as number | null;
  if (
    !enquiryId ||
    enquiryId.length > 128 ||
    !categoryId ||
    categoryId.length > 128 ||
    !eventDate ||
    !validTime(setupStartTime) ||
    !validTime(startTime) ||
    !validTime(endTime) ||
    !validTime(cleanupEndTime) ||
    setupStartTime > startTime ||
    startTime >= endTime ||
    endTime > cleanupEndTime ||
    !venue ||
    venue.length > 120 ||
    !contactNumber ||
    contactNumber.length > 40 ||
    (venueCapacity !== null &&
      (!Number.isSafeInteger(venueCapacity) || venueCapacity < 1))
  ) {
    return {
      success: false,
      message: "Check the category, date, ordered schedule, venue, and capacity.",
    };
  }

  try {
    const eventNumber = await getPrisma().$transaction(
      async (transaction) => {
        const enquiry = await transaction.enquiry.findFirst({
          where: {
            id: enquiryId,
            deletedAt: null,
            eventCategoryId: { not: null },
            source: "Customer Portal",
          },
          select: {
            id: true,
            enquiryNumber: true,
            customerId: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            description: true,
            status: true,
            convertedBookingId: true,
            events: { select: { id: true, eventNumber: true }, take: 1 },
          },
        });
        if (!enquiry) throw new Error("EVENT_REQUEST_NOT_FOUND");
        const request = parseCustomerEventRequest(enquiry.description);
        if (!request || !enquiry.customerId) {
          throw new Error("EVENT_REQUEST_NOT_ELIGIBLE");
        }
        if (
          enquiry.status === EnquiryStatus.CLOSED ||
          enquiry.status === EnquiryStatus.LOST ||
          enquiry.status === EnquiryStatus.CONVERTED ||
          enquiry.convertedBookingId
        ) {
          throw new Error("EVENT_REQUEST_NOT_ELIGIBLE");
        }
        if (enquiry.events.length) {
          throw new Error(`EVENT_ALREADY_CREATED:${enquiry.events[0].eventNumber}`);
        }
        const [customer, category] = await Promise.all([
          transaction.user.findFirst({
            where: { id: enquiry.customerId, role: "customer", banned: false },
            select: { id: true },
          }),
          transaction.eventCategory.findFirst({
            where: { id: categoryId, isActive: true },
            select: { id: true },
          }),
        ]);
        if (!customer) throw new Error("EVENT_REQUEST_CUSTOMER_NOT_FOUND");
        if (!category) throw new Error("EVENT_CATEGORY_NOT_ACTIVE");

        const id = randomUUID();
        const number = `EVT-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
        const event = await transaction.event.create({
          data: {
            id,
            eventNumber: number,
            name: request.eventName,
            categoryId,
            description: request.eventDescription || `Created from event request ${enquiry.enquiryNumber}.`,
            eventDate,
            setupStartTime,
            startTime,
            endTime,
            cleanupEndTime,
            status: EventStatus.DRAFT,
            customerId: customer.id,
            customerName: enquiry.customerName,
            contactNumber,
            emailAddress: enquiry.customerEmail,
            companyName: request.companyName || null,
            expectedGuests: request.expectedGuests,
            adults: request.adults,
            children: request.children,
            occasion: request.categoryName,
            seatingArrangement: request.seatingArrangement || null,
            venue,
            venueCapacity,
            venueRequirements: request.specialRequirements || null,
            foodBeverageRequirements: request.foodBeverageRequirements || null,
            decorationRequirements: request.decorationRequirements || null,
            entertainmentRequirements: request.entertainmentRequirements || null,
            additionalNotes: request.additionalNotes || null,
            enquiryId: enquiry.id,
            createdById: actorId,
          },
          select: { id: true, eventNumber: true },
        });
        await transaction.eventStatusHistory.create({
          data: {
            id: randomUUID(),
            eventId: event.id,
            previousStatus: null,
            newStatus: EventStatus.DRAFT,
            remarks: `Created from customer event request ${enquiry.enquiryNumber}.`,
            changedById: actorId,
          },
        });
        await transaction.eventActivity.create({
          data: {
            id: randomUUID(),
            eventId: event.id,
            activityType: "CREATED",
            description: "Event created as a draft from a customer request. It is not confirmed.",
            createdById: actorId,
          },
        });
        if (enquiry.status !== EnquiryStatus.IN_PROGRESS) {
          await transaction.enquiry.update({
            where: { id: enquiry.id },
            data: {
              status: EnquiryStatus.IN_PROGRESS,
              updatedAt: new Date(),
            },
          });
          await transaction.enquiryStatusHistory.create({
            data: {
              id: randomUUID(),
              enquiryId: enquiry.id,
              previousStatus: enquiry.status,
              newStatus: EnquiryStatus.IN_PROGRESS,
              remarks: `Event ${event.eventNumber} created as a draft for review.`,
              changedById: actorId,
            },
          });
        }
        await transaction.enquiryActivity.create({
          data: {
            id: randomUUID(),
            enquiryId: enquiry.id,
            activityType: "EVENT_CREATED",
            description: `Draft event ${event.eventNumber} created. The event is not confirmed.`,
            createdById: actorId,
          },
        });
        return event.eventNumber;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    revalidatePath("/admin/events");
    revalidatePath("/admin/enquiries");
    revalidatePath("/customer/events");
    revalidatePath(`/customer/events/${enquiryId}`);
    return { success: true, eventNumber };
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        EVENT_REQUEST_NOT_FOUND: "This event request no longer exists.",
        EVENT_REQUEST_NOT_ELIGIBLE: "This event request is not eligible for conversion.",
        EVENT_REQUEST_CUSTOMER_NOT_FOUND: "The linked customer account is no longer available.",
        EVENT_CATEGORY_NOT_ACTIVE: "Select an active event category.",
        ENQUIRY_ALREADY_HAS_EVENT: "This event request is already linked to an event.",
      };
      if (messages[error.message]) {
        return { success: false, message: messages[error.message] };
      }
      if (error.message.startsWith("EVENT_ALREADY_CREATED:")) {
        return {
          success: false,
          message: `This request is already linked to event ${error.message.slice("EVENT_ALREADY_CREATED:".length)}.`,
        };
      }
    }
    if (isRequestError(error, "P2034")) {
      return {
        success: false,
        message: "The event request changed at the same time. Refresh and try again.",
      };
    }
    if (isRequestError(error, "P2002")) {
      return {
        success: false,
        message: "This request was already converted to an event. Refresh to see it.",
      };
    }
    throw error;
  }
}

export async function deleteEvent(id: unknown): Promise<EventActionResult> {
  const actorId = await getAdminActorId();
  if (!actorId) return { success: false, message: "Your session expired. Sign in again." };
  if (typeof id !== "string" || !id || id.length > 128) {
    return { success: false, message: "This event could not be found." };
  }
  const prisma = getPrisma();
  const event = await prisma.event.findFirst({ where: { id, deletedAt: null }, select: { eventNumber: true } });
  if (!event) return { success: false, message: "This event no longer exists." };
  await prisma.$transaction([
    prisma.event.update({ where: { id }, data: { deletedAt: new Date() } }),
    prisma.eventActivity.create({
      data: {
        id: randomUUID(),
        eventId: id,
        activityType: "DELETED",
        description: "Event removed from the active directory.",
        createdById: actorId,
      },
    }),
  ]);
  revalidatePath("/admin/events");
  return { success: true };
}

export async function saveEventCategory(value: unknown): Promise<EventActionResult> {
  const actorId = await getAdminActorId();
  if (!actorId) return { success: false, message: "Your session expired. Sign in again." };
  if (!isRecord(value) || typeof value.name !== "string" ||
      (value.id !== undefined && typeof value.id !== "string") ||
      typeof value.isActive !== "boolean") {
    return { success: false, message: "Enter a valid event category." };
  }
  const name = value.name.trim();
  const id = value.id as string | undefined;
  if (!name || name.length > 80 || (id !== undefined && (!id || id.length > 128))) {
    return { success: false, message: "Category names must be 1–80 characters." };
  }
  const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const slug = `${slugBase || "category"}-${randomUUID().slice(0, 8)}`;
  try {
    const prisma = getPrisma();
    if (id) {
      await prisma.eventCategory.update({ where: { id }, data: { name, isActive: value.isActive } });
    } else {
      await prisma.eventCategory.create({
        data: { id: randomUUID(), name, slug, isActive: true },
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, message: "A category with that name already exists." };
    }
    throw error;
  }
  revalidatePath("/admin/events");
  revalidatePath("/admin/event-categories");
  return { success: true };
}

export async function saveEventChecklistItem(value: unknown): Promise<EventActionResult> {
  const actorId = await getAdminActorId();
  if (!actorId) return { success: false, message: "Your session expired. Sign in again." };
  if (
    !isRecord(value) ||
    typeof value.eventId !== "string" ||
    typeof value.name !== "string" ||
    typeof value.description !== "string" ||
    typeof value.assignedToId !== "string" ||
    typeof value.dueDate !== "string" ||
    typeof value.priority !== "string" ||
    typeof value.status !== "string" ||
    (value.id !== undefined && typeof value.id !== "string")
  ) {
    return { success: false, message: "Enter the required checklist information." };
  }
  const eventId = value.eventId.trim();
  const id = value.id as string | undefined;
  const name = value.name.trim();
  const description = value.description.trim();
  const assignedToId = value.assignedToId.trim();
  const dueDate = value.dueDate ? validDate(value.dueDate) : null;
  if (!eventId || eventId.length > 128 || (id !== undefined && (!id || id.length > 128)) ||
      !name || name.length > 160 || description.length > 3000 ||
      (value.dueDate && !dueDate)) {
    return { success: false, message: "Enter valid checklist details." };
  }
  if (!eventTaskPriorities.includes(value.priority as EventTaskPriorityValue) ||
      !eventTaskStatuses.includes(value.status as EventTaskStatusValue)) {
    return { success: false, message: "Select a valid checklist priority and status." };
  }
  const prisma = getPrisma();
  const [event, assignee] = await Promise.all([
    prisma.event.findFirst({ where: { id: eventId, deletedAt: null }, select: { id: true } }),
    assignedToId
      ? prisma.user.findFirst({
          where: { id: assignedToId, role: { in: ["admin", "agent"] }, banned: false },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  if (!event) return { success: false, message: "This event no longer exists." };
  if (assignedToId && !assignee) return { success: false, message: "Select an active staff member." };
  if (id) {
    const existing = await prisma.eventChecklistItem.findFirst({ where: { id, eventId }, select: { id: true } });
    if (!existing) return { success: false, message: "This checklist item no longer exists." };
  }
  await prisma.$transaction(async (tx) => {
    const data = {
      name,
      description: description || null,
      assignedToId: assignedToId || null,
      dueDate,
      priority: value.priority as EventTaskPriorityValue,
      status: value.status as EventTaskStatusValue,
      completedById: value.status === EventTaskStatus.COMPLETED ? actorId : null,
      completedAt: value.status === EventTaskStatus.COMPLETED ? new Date() : null,
    };
    if (id) {
      await tx.eventChecklistItem.update({ where: { id }, data });
    } else {
      await tx.eventChecklistItem.create({
        data: { id: randomUUID(), eventId, ...data, createdById: actorId },
      });
    }
    await addActivity(tx, {
      eventId,
      activityType: id ? "CHECKLIST_UPDATED" : "CHECKLIST_ADDED",
      description: `${id ? "Checklist item updated" : "Checklist item added"}: ${name}.`,
      createdById: actorId,
    });
  });
  revalidatePath("/admin/events");
  return { success: true };
}

export async function deleteEventChecklistItem(id: unknown): Promise<EventActionResult> {
  const actorId = await getAdminActorId();
  if (!actorId) return { success: false, message: "Your session expired. Sign in again." };
  if (typeof id !== "string" || !id || id.length > 128) {
    return { success: false, message: "This checklist item could not be found." };
  }
  const item = await getPrisma().eventChecklistItem.findUnique({
    where: { id },
    select: { eventId: true, name: true },
  });
  if (!item) return { success: false, message: "This checklist item no longer exists." };
  await getPrisma().$transaction(async (tx) => {
    await tx.eventChecklistItem.delete({ where: { id } });
    await addActivity(tx, {
      eventId: item.eventId,
      activityType: "CHECKLIST_REMOVED",
      description: `Checklist item removed: ${item.name}.`,
      createdById: actorId,
    });
  });
  revalidatePath("/admin/events");
  return { success: true };
}
