import { connection } from "next/server";
import { AdminEnquiryManagement } from "@/components/admin/admin-enquiry-management";
import {
  enquiryPriorities,
  enquiryStatuses,
  enquiryTypes,
} from "@/lib/enquiry-constants";
import { EnquiryFollowupStatus } from "@/generated/prisma/client";
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
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : undefined;
}

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();
  const params = await searchParams;
  const query = firstValue(params.q)?.trim().slice(0, 120) ?? "";
  const statusValue = firstValue(params.status);
  const priorityValue = firstValue(params.priority);
  const typeValue = firstValue(params.type);
  const followupValue = firstValue(params.followup);
  const status = enquiryStatuses.find((value) => value === statusValue);
  const priority = enquiryPriorities.find((value) => value === priorityValue);
  const enquiryType = enquiryTypes.find((value) => value === typeValue);
  const followup =
    followupValue === "upcoming" || followupValue === "overdue"
      ? followupValue
      : "";
  const agentId = firstValue(params.agent)?.slice(0, 128);
  const enquiryDate = parseDate(firstValue(params.date));
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const sortValue = firstValue(params.sort);
  const sort = sortValue === "nextFollowUpAt" ? "nextFollowUpAt" : "createdAt";
  const direction = firstValue(params.direction) === "asc" ? "asc" : "desc";
  const pageSizeValue = parsePage(firstValue(params.pageSize), 10);
  const pageSize = [10, 25, 50, 100].includes(pageSizeValue)
    ? pageSizeValue
    : 10;
  const requestedPage = parsePage(firstValue(params.page), 1);
  const where = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(enquiryType ? { enquiryType } : {}),
    ...(agentId ? { assignedAgentId: agentId } : {}),
    ...(followup === "upcoming"
      ? { nextFollowUpAt: { gte: today } }
      : followup === "overdue"
        ? { nextFollowUpAt: { lt: today } }
        : {}),
    ...(enquiryDate
      ? {
          createdAt: {
            gte: enquiryDate,
            lt: new Date(enquiryDate.getTime() + 24 * 60 * 60 * 1000),
          },
        }
      : {}),
    ...(query
      ? {
          OR: [
            { enquiryNumber: { contains: query, mode: "insensitive" as const } },
            { customerName: { contains: query, mode: "insensitive" as const } },
            { customerEmail: { contains: query, mode: "insensitive" as const } },
            { customerPhone: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const prisma = getPrisma();
  const now = new Date();
  const [total, customers, agents, upcomingFollowups, eventCategories, overdueFollowups] =
    await Promise.all([
      prisma.enquiry.count({ where }),
      prisma.user.findMany({
        where: { role: "customer", banned: false },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, phone: true },
      }),
      prisma.user.findMany({
        where: { role: "agent", banned: false },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true },
      }),
      prisma.enquiryFollowup.count({
        where: {
          status: EnquiryFollowupStatus.SCHEDULED,
          scheduledDate: { gte: new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`) },
          enquiry: { deletedAt: null },
        },
      }),
      prisma.eventCategory.findMany({
        where: { isActive: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: { id: true, name: true },
      }),
      prisma.enquiryFollowup.count({
        where: {
          status: EnquiryFollowupStatus.SCHEDULED,
          scheduledDate: { lt: new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`) },
          enquiry: { deletedAt: null },
        },
      }),
    ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const enquiries = await prisma.enquiry.findMany({
    where,
    orderBy: [
      sort === "nextFollowUpAt"
        ? { nextFollowUpAt: { sort: direction, nulls: "last" } }
        : { createdAt: direction },
      { createdAt: "desc" },
      { id: "desc" },
    ],
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      customer: {
        select: { id: true, name: true, email: true, phone: true },
      },
      assignedAgent: { select: { id: true, name: true, email: true } },
      assignedBy: { select: { name: true } },
      createdBy: { select: { name: true } },
      convertedBooking: { select: { id: true, bookingNumber: true } },
      events: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { id: true, eventNumber: true, name: true, status: true },
      },
      followups: {
        orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
      },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        include: { changedBy: { select: { name: true } } },
      },
      activities: {
        orderBy: { createdAt: "asc" },
        include: { createdBy: { select: { name: true } } },
      },
    },
  });

  return (
    <AdminEnquiryManagement
      agents={agents}
      customers={customers}
      eventCategories={eventCategories}
      enquiries={enquiries.map((enquiry) => ({
        ...enquiry,
        preferredEventDate: enquiry.preferredEventDate?.toISOString().slice(0, 10) ?? null,
        createdAt: enquiry.createdAt.toISOString(),
        updatedAt: enquiry.updatedAt.toISOString(),
        assignedAt: enquiry.assignedAt?.toISOString() ?? null,
        nextFollowUpAt: enquiry.nextFollowUpAt?.toISOString() ?? null,
        followups: enquiry.followups.map((followup) => ({
          ...followup,
          scheduledDate: followup.scheduledDate.toISOString().slice(0, 10),
          completedAt: followup.completedAt?.toISOString() ?? null,
          createdAt: followup.createdAt.toISOString(),
          updatedAt: followup.updatedAt.toISOString(),
        })),
        statusHistory: enquiry.statusHistory.map((entry) => ({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
        })),
        activities: enquiry.activities.map((activity) => ({
          ...activity,
          createdAt: activity.createdAt.toISOString(),
        })),
      }))}
      filters={{
        q: query,
        status: status ?? "",
        priority: priority ?? "",
        type: enquiryType ?? "",
        followup,
        agent: agentId ?? "",
        date: firstValue(params.date) ?? "",
        sort,
        direction,
        page,
        pageSize,
      }}
      pageCount={pageCount}
      total={total}
      upcomingFollowups={upcomingFollowups}
      overdueFollowups={overdueFollowups}
    />
  );
}
