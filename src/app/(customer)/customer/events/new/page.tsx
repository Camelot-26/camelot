import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CustomerEventForm } from "@/components/customer/customer-event-form";
import { CustomerEventLoading } from "@/components/customer/customer-event-loading";
import { getCustomerBookingUser } from "@/lib/customer-booking";
import { getPrisma } from "@/lib/prisma";

export default function NewCustomerEventPage() {
  return (
    <Suspense
      fallback={<CustomerEventLoading message="Loading your event form…" />}
    >
      <NewCustomerEventContent />
    </Suspense>
  );
}

async function NewCustomerEventContent() {
  const customer = await getCustomerBookingUser();
  if (!customer) redirect("/login?role=customer");

  const categories = await getPrisma().eventCategory.findMany({
    where: { isActive: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <CustomerEventForm
      categories={categories}
      profile={{
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      }}
    />
  );
}
