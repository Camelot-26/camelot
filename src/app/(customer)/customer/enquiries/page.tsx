import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CustomerEnquiryLoading } from "@/components/customer/customer-enquiry-loading";
import { CustomerEnquiries } from "@/components/customer/customer-enquiries";
import {
  customerEnquiryTypes,
  enquiryStatuses,
  type EnquiryStatusValue,
} from "@/lib/enquiry-constants";
import { getCustomerBookingUser } from "@/lib/customer-booking";
import { getPrisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export default function CustomerEnquiriesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <Suspense
      fallback={<CustomerEnquiryLoading message="Loading your enquiries…" />}
    >
      <CustomerEnquiriesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CustomerEnquiriesContent({
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
  const typeValue = firstValue(params.type);
  const enquiryType = customerEnquiryTypes.find(
    (type) => type.value === typeValue,
  )?.value;
  const statusValue = firstValue(params.status);
  const status = enquiryStatuses.find(
    (value) => value === statusValue,
  ) as EnquiryStatusValue | undefined;
  const requestedPage = positiveInteger(firstValue(params.page), 1);
  const requestedPageSize = positiveInteger(firstValue(params.pageSize), 10);
  const pageSize = [10, 25, 50].includes(requestedPageSize)
    ? requestedPageSize
    : 10;

  const where: Prisma.EnquiryWhereInput = {
    customerId: customer.id,
    eventCategoryId: null,
    deletedAt: null,
    ...(enquiryType ? { enquiryType } : {}),
    ...(status ? { status } : {}),
    ...(query
      ? {
          OR: [
            {
              enquiryNumber: {
                contains: query,
                mode: "insensitive",
              },
            },
            { subject: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const prisma = getPrisma();
  const total = await prisma.enquiry.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const enquiries = await prisma.enquiry.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      enquiryNumber: true,
      subject: true,
      enquiryType: true,
      createdAt: true,
      updatedAt: true,
      status: true,
    },
  });

  return (
    <CustomerEnquiries
      enquiries={enquiries.map((enquiry) => ({
        ...enquiry,
        createdAt: enquiry.createdAt.toISOString(),
        updatedAt: enquiry.updatedAt.toISOString(),
      }))}
      filters={{
        q: query,
        type: enquiryType ?? "",
        status: status ?? "",
        page,
        pageSize,
      }}
      pageCount={pageCount}
      total={total}
    />
  );
}
