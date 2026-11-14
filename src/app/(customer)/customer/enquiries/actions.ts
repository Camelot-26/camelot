"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { EnquiryPriority, EnquiryStatus, Prisma } from "@/generated/prisma/client";
import {
  customerEnquiryTypes,
  type EnquiryTypeValue,
} from "@/lib/enquiry-constants";
import { getCustomerBookingUser } from "@/lib/customer-booking";
import { validateEnquiryDetails } from "@/lib/enquiry-validation";
import { getPrisma } from "@/lib/prisma";

type CustomerEnquiryActionResult =
  | { success: true; enquiryId: string; enquiryNumber: string }
  | { success: false; message: string };

type CustomerMessageActionResult =
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

export async function createCustomerEnquiry(
  value: unknown,
): Promise<CustomerEnquiryActionResult> {
  const customer = await getCustomerBookingUser();
  if (!customer) {
    return { success: false, message: "Your session expired. Sign in again." };
  }
  if (
    !isRecord(value) ||
    typeof value.subject !== "string" ||
    typeof value.enquiryType !== "string" ||
    typeof value.description !== "string"
  ) {
    return { success: false, message: "Enter the required enquiry information." };
  }

  const details = {
    customerName: customer.name.trim(),
    customerEmail: customer.email.trim().toLowerCase(),
    customerPhone: customer.phone?.trim() ?? "",
    subject: value.subject.trim(),
    enquiryType: value.enquiryType.trim(),
    description: value.description.trim(),
  };
  const allowedTypes = customerEnquiryTypes.map((type) => type.value);
  if (!allowedTypes.includes(details.enquiryType as (typeof allowedTypes)[number])) {
    return { success: false, message: "Select a valid enquiry type." };
  }
  const validationError = validateEnquiryDetails(details);
  if (validationError) {
    return { success: false, message: validationError };
  }

  try {
    const enquiry = await getPrisma().$transaction(async (transaction) => {
      const enquiryNumber = `EN-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
      const created = await transaction.enquiry.create({
        data: {
          id: randomUUID(),
          enquiryNumber,
          customerId: customer.id,
          customerName: details.customerName,
          customerEmail: details.customerEmail,
          customerPhone: details.customerPhone || null,
          subject: details.subject,
          enquiryType: details.enquiryType as EnquiryTypeValue,
          description: details.description,
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

    revalidatePath("/customer/enquiries");
    revalidatePath("/admin/enquiries");
    return {
      success: true,
      enquiryId: enquiry.id,
      enquiryNumber: enquiry.enquiryNumber,
    };
  } catch (error) {
    if (isRequestError(error, "P2002")) {
      return {
        success: false,
        message: "An enquiry number conflict occurred. Please try again.",
      };
    }
    if (isRequestError(error, "P2034")) {
      return {
        success: false,
        message: "The enquiry changed at the same time. Please try again.",
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

export async function sendCustomerEnquiryMessage(
  enquiryIdValue: unknown,
  messageValue: unknown,
): Promise<CustomerMessageActionResult> {
  const customer = await getCustomerBookingUser();
  if (!customer) {
    return { success: false, message: "Your session expired. Sign in again." };
  }
  if (
    typeof enquiryIdValue !== "string" ||
    !enquiryIdValue ||
    enquiryIdValue.length > 128
  ) {
    return { success: false, message: "This enquiry could not be found." };
  }
  if (typeof messageValue !== "string") {
    return { success: false, message: "Enter a message." };
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
            id: enquiryIdValue,
            customerId: customer.id,
            deletedAt: null,
          },
          select: { status: true },
        });
        if (!enquiry) return "NOT_FOUND" as const;
        if (
          enquiry.status === EnquiryStatus.CONVERTED ||
          enquiry.status === EnquiryStatus.CLOSED ||
          enquiry.status === EnquiryStatus.LOST
        ) {
          return "CLOSED" as const;
        }

        await transaction.enquiryActivity.create({
          data: {
            id: randomUUID(),
            enquiryId: enquiryIdValue,
            activityType: "CUSTOMER_MESSAGE",
            description: message,
            createdById: customer.id,
          },
        });
        await transaction.enquiry.update({
          where: { id: enquiryIdValue },
          data: { updatedAt: new Date() },
        });
        return "SENT" as const;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (result === "NOT_FOUND") {
      return { success: false, message: "This enquiry could not be found." };
    }
    if (result === "CLOSED") {
      return {
        success: false,
        message: "This enquiry is closed and can no longer receive messages.",
      };
    }

    revalidatePath("/customer/enquiries");
    revalidatePath(`/customer/enquiries/${enquiryIdValue}`);
    revalidatePath("/admin/enquiries");
    return { success: true };
  } catch (error) {
    if (isRequestError(error, "P2034")) {
      return {
        success: false,
        message: "The enquiry changed at the same time. Please try again.",
      };
    }
    throw error;
  }
}
