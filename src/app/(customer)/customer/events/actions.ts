"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  EnquiryPriority,
  EnquiryStatus,
  EventStatus,
  Prisma,
} from "@/generated/prisma/client";
import { getCustomerBookingUser } from "@/lib/customer-booking";
import {
  parseCustomerEventRequest,
  serializeCustomerEventRequest,
  type CustomerEventRequestDetails,
} from "@/lib/customer-event-requests";
import { getPrisma } from "@/lib/prisma";

type EventRequestResult =
  | { success: true; enquiryId: string; eventRequestId: string }
  | { success: false; message: string };

type CustomerEventActionResult =
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

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

function getEnquiryType(categoryName: string) {
  const normalized = categoryName.toLowerCase();
  if (normalized.includes("birthday")) return "Birthday celebration";
  if (normalized.includes("corporate")) return "Corporate event";
  if (normalized.includes("group")) return "Group dining";
  return "Private event";
}

function getEventRequestDetails(value: unknown): CustomerEventRequestDetails | string {
  if (!isRecord(value)) return "Enter the required event information.";
  const stringKeys = [
    "eventName",
    "categoryId",
    "eventDescription",
    "preferredDate",
    "preferredStartTime",
    "preferredEndTime",
    "companyName",
    "seatingArrangement",
    "foodBeverageRequirements",
    "decorationRequirements",
    "entertainmentRequirements",
    "specialRequirements",
    "additionalNotes",
  ] as const;
  if (stringKeys.some((key) => typeof value[key] !== "string")) {
    return "Enter the required event information.";
  }
  if (
    !Number.isSafeInteger(value.expectedGuests) ||
    !Number.isSafeInteger(value.adults) ||
    !Number.isSafeInteger(value.children)
  ) {
    return "Enter valid guest counts.";
  }

  const details: CustomerEventRequestDetails = {
    eventName: (value.eventName as string).trim(),
    categoryId: (value.categoryId as string).trim(),
    categoryName: "",
    eventDescription: (value.eventDescription as string).trim(),
    preferredDate: value.preferredDate as string,
    preferredStartTime: value.preferredStartTime as string,
    preferredEndTime: value.preferredEndTime as string,
    companyName: (value.companyName as string).trim(),
    expectedGuests: value.expectedGuests as number,
    adults: value.adults as number,
    children: value.children as number,
    seatingArrangement: (value.seatingArrangement as string).trim(),
    foodBeverageRequirements: (value.foodBeverageRequirements as string).trim(),
    decorationRequirements: (value.decorationRequirements as string).trim(),
    entertainmentRequirements: (value.entertainmentRequirements as string).trim(),
    specialRequirements: (value.specialRequirements as string).trim(),
    additionalNotes: (value.additionalNotes as string).trim(),
  };
  const date = validDate(details.preferredDate);
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const lengths: [string, number][] = [
    [details.eventName, 180],
    [details.categoryId, 128],
    [details.eventDescription, 5000],
    [details.companyName, 200],
    [details.seatingArrangement, 1000],
    [details.foodBeverageRequirements, 2000],
    [details.decorationRequirements, 2000],
    [details.entertainmentRequirements, 2000],
    [details.specialRequirements, 2000],
    [details.additionalNotes, 2000],
  ];
  if (
    !details.eventName ||
    lengths.some(([text, max]) => text.length > max) ||
    !date ||
    date < today ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(details.preferredStartTime) ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(details.preferredEndTime) ||
    details.preferredStartTime >= details.preferredEndTime ||
    details.expectedGuests < 1 ||
    details.expectedGuests > 10000 ||
    details.adults < 0 ||
    details.children < 0 ||
    details.adults + details.children !== details.expectedGuests
  ) {
    return "Check the event name, date, time, requirements, and guest counts.";
  }
  return details;
}

export async function createCustomerEventRequest(
  value: unknown,
): Promise<EventRequestResult> {
  const customer = await getCustomerBookingUser();
  if (!customer) {
    return { success: false, message: "Your session expired. Sign in again." };
  }

  const details = getEventRequestDetails(value);
  if (typeof details === "string") {
    return { success: false, message: details };
  }

  const category = await getPrisma().eventCategory.findFirst({
    where: { id: details.categoryId, isActive: true },
    select: { id: true, name: true },
  });
  if (!category) {
    return {
      success: false,
      message: "Select an active event category and try again.",
    };
  }
  details.categoryName = category.name;
  const description = serializeCustomerEventRequest(details);
  if (description.length > 10000) {
    return {
      success: false,
      message: "Please shorten the event requirements and try again.",
    };
  }
  const eventDate = validDate(details.preferredDate)!;

  try {
    const enquiry = await getPrisma().$transaction(async (transaction) => {
      const enquiryNumber = `EVR-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
      const created = await transaction.enquiry.create({
        data: {
          id: randomUUID(),
          enquiryNumber,
          customerId: customer.id,
          customerName: customer.name.trim(),
          customerEmail: customer.email.trim().toLowerCase(),
          customerPhone: customer.phone?.trim() || null,
          subject: details.eventName,
          enquiryType: getEnquiryType(category.name),
          description,
          eventCategoryId: category.id,
          preferredEventDate: eventDate,
          eventExpectedGuests: details.expectedGuests,
          source: "Customer Portal",
          priority: EnquiryPriority.MEDIUM,
          status: EnquiryStatus.NEW,
          createdById: customer.id,
        },
        select: { id: true, enquiryNumber: true },
      });
      await transaction.enquiryStatusHistory.create({
        data: {
          id: randomUUID(),
          enquiryId: created.id,
          previousStatus: null,
          newStatus: EnquiryStatus.NEW,
          changedById: customer.id,
        },
      });
      return created;
    });

    revalidatePath("/customer/events");
    revalidatePath("/customer/enquiries");
    revalidatePath("/admin/enquiries");
    return {
      success: true,
      enquiryId: enquiry.id,
      eventRequestId: enquiry.enquiryNumber,
    };
  } catch (error) {
    if (isRequestError(error, "P2002")) {
      return {
        success: false,
        message: "An event request number conflict occurred. Please try again.",
      };
    }
    if (isRequestError(error, "P2003")) {
      return {
        success: false,
        message: "The selected category or customer profile is no longer available.",
      };
    }
    throw error;
  }
}

export async function sendCustomerEventMessage(
  requestIdValue: unknown,
  messageValue: unknown,
): Promise<CustomerEventActionResult> {
  const customer = await getCustomerBookingUser();
  if (!customer) {
    return { success: false, message: "Your session expired. Sign in again." };
  }
  if (
    typeof requestIdValue !== "string" ||
    !requestIdValue ||
    requestIdValue.length > 128 ||
    typeof messageValue !== "string"
  ) {
    return { success: false, message: "Enter a message for this event request." };
  }
  const message = messageValue.trim();
  if (!message || message.length > 10000) {
    return {
      success: false,
      message: "Enter a message of up to 10,000 characters.",
    };
  }

  try {
    const result = await getPrisma().$transaction(
      async (transaction) => {
        const enquiry = await transaction.enquiry.findFirst({
          where: {
            id: requestIdValue,
            customerId: customer.id,
            deletedAt: null,
            eventCategoryId: { not: null },
          },
          select: {
            id: true,
            description: true,
            status: true,
            convertedBookingId: true,
            events: {
              where: { customerId: customer.id, deletedAt: null },
              select: { id: true, status: true },
              take: 1,
            },
          },
        });
        if (enquiry && parseCustomerEventRequest(enquiry.description)) {
          if (
            enquiry.status === EnquiryStatus.CLOSED ||
            enquiry.status === EnquiryStatus.LOST ||
            (enquiry.status === EnquiryStatus.CONVERTED &&
              (!enquiry.events.length || enquiry.convertedBookingId))
          ) {
            return "CLOSED" as const;
          }
          if (
            enquiry.events.some(
              (event) =>
                event.status === EventStatus.COMPLETED ||
                event.status === EventStatus.CANCELLED,
            )
          ) {
            return "CLOSED" as const;
          }

          await transaction.enquiryActivity.create({
            data: {
              id: randomUUID(),
              enquiryId: enquiry.id,
              activityType: "CUSTOMER_MESSAGE",
              description: message,
              createdById: customer.id,
            },
          });
          if (enquiry.events[0]) {
            await transaction.eventActivity.create({
              data: {
                id: randomUUID(),
                eventId: enquiry.events[0].id,
                activityType: "CUSTOMER_MESSAGE",
                description: message,
                createdById: customer.id,
              },
            });
          }
          await transaction.enquiry.update({
            where: { id: enquiry.id },
            data: { updatedAt: new Date() },
          });
          return "SENT" as const;
        }

        const event = await transaction.event.findFirst({
          where: {
            id: requestIdValue,
            customerId: customer.id,
            deletedAt: null,
          },
          select: { id: true, status: true },
        });
        if (!event) return "NOT_FOUND" as const;
        if (
          event.status === EventStatus.COMPLETED ||
          event.status === EventStatus.CANCELLED
        ) {
          return "CLOSED" as const;
        }
        await transaction.eventActivity.create({
          data: {
            id: randomUUID(),
            eventId: event.id,
            activityType: "CUSTOMER_MESSAGE",
            description: message,
            createdById: customer.id,
          },
        });
        return "SENT" as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result === "NOT_FOUND") {
      return { success: false, message: "This event request could not be found." };
    }
    if (result === "CLOSED") {
      return {
        success: false,
        message: "This event request is closed and can no longer receive messages.",
      };
    }
    revalidatePath("/customer/events");
    revalidatePath(`/customer/events/${requestIdValue}`);
    revalidatePath("/admin/enquiries");
    revalidatePath("/admin/events");
    return { success: true };
  } catch (error) {
    if (isRequestError(error, "P2034")) {
      return {
        success: false,
        message: "The event request changed at the same time. Please try again.",
      };
    }
    throw error;
  }
}

export async function requestCustomerEventCancellation(
  recordIdValue: unknown,
  reasonValue: unknown,
): Promise<CustomerEventActionResult> {
  const customer = await getCustomerBookingUser();
  if (!customer) {
    return { success: false, message: "Your session expired. Sign in again." };
  }
  if (
    typeof recordIdValue !== "string" ||
    !recordIdValue ||
    recordIdValue.length > 128 ||
    typeof reasonValue !== "string"
  ) {
    return { success: false, message: "Enter a cancellation reason." };
  }
  const reason = reasonValue.trim();
  if (!reason || reason.length > 2000) {
    return {
      success: false,
      message: "Enter a cancellation reason of up to 2,000 characters.",
    };
  }

  try {
    const result = await getPrisma().$transaction(
      async (transaction) => {
        const enquiry = await transaction.enquiry.findFirst({
          where: {
            id: recordIdValue,
            customerId: customer.id,
            deletedAt: null,
            eventCategoryId: { not: null },
          },
          select: {
            id: true,
            description: true,
            status: true,
            events: {
              where: { customerId: customer.id, deletedAt: null },
              select: { id: true, status: true },
              take: 1,
            },
            activities: {
              where: { activityType: "CUSTOMER_CANCELLATION_REQUEST" },
              select: { id: true },
              take: 1,
            },
          },
        });
        if (enquiry && parseCustomerEventRequest(enquiry.description)) {
          if (
            enquiry.status === EnquiryStatus.CLOSED ||
            enquiry.status === EnquiryStatus.LOST ||
            enquiry.events.some(
              (event) =>
                event.status === EventStatus.COMPLETED ||
                event.status === EventStatus.CANCELLED,
            )
          ) {
            return "NOT_CANCELLABLE" as const;
          }
          if (enquiry.activities.length) return "ALREADY_REQUESTED" as const;

          await transaction.enquiryActivity.create({
            data: {
              id: randomUUID(),
              enquiryId: enquiry.id,
              activityType: "CUSTOMER_CANCELLATION_REQUEST",
              description: reason,
              createdById: customer.id,
            },
          });
          if (enquiry.events[0]) {
            await transaction.eventActivity.create({
              data: {
                id: randomUUID(),
                eventId: enquiry.events[0].id,
                activityType: "CUSTOMER_CANCELLATION_REQUEST",
                description: reason,
                createdById: customer.id,
              },
            });
            await transaction.event.update({
              where: { id: enquiry.events[0].id },
              data: { updatedAt: new Date() },
            });
          }
          await transaction.enquiry.update({
            where: { id: enquiry.id },
            data: { updatedAt: new Date() },
          });
          return { state: "CREATED" as const, enquiryId: enquiry.id };
        }

        const event = await transaction.event.findFirst({
          where: {
            id: recordIdValue,
            customerId: customer.id,
            deletedAt: null,
          },
          select: {
            id: true,
            status: true,
            activities: {
              where: { activityType: "CUSTOMER_CANCELLATION_REQUEST" },
              select: { id: true },
              take: 1,
            },
          },
        });
        if (!event) return "NOT_FOUND" as const;
        if (
          event.status === EventStatus.COMPLETED ||
          event.status === EventStatus.CANCELLED
        ) {
          return "NOT_CANCELLABLE" as const;
        }
        if (event.activities.length) return "ALREADY_REQUESTED" as const;

        await transaction.eventActivity.create({
          data: {
            id: randomUUID(),
            eventId: event.id,
            activityType: "CUSTOMER_CANCELLATION_REQUEST",
            description: reason,
            createdById: customer.id,
          },
        });
        await transaction.event.update({
          where: { id: event.id },
          data: { updatedAt: new Date() },
        });
        return { state: "CREATED" as const, enquiryId: null };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result === "NOT_FOUND") {
      return { success: false, message: "This event request could not be found." };
    }
    if (result === "NOT_CANCELLABLE") {
      return {
        success: false,
        message: "A cancellation request is not available for this event.",
      };
    }
    if (result === "ALREADY_REQUESTED") {
      return {
        success: false,
        message: "A cancellation request is already awaiting review.",
      };
    }
    revalidatePath("/customer/events");
    revalidatePath(`/customer/events/${recordIdValue}`);
    revalidatePath("/admin/enquiries");
    revalidatePath("/admin/events");
    if (result.enquiryId) {
      revalidatePath(`/customer/events/${result.enquiryId}`);
    }
    return { success: true };
  } catch (error) {
    if (isRequestError(error, "P2034")) {
      return {
        success: false,
        message: "The event changed at the same time. Please try again.",
      };
    }
    throw error;
  }
}
