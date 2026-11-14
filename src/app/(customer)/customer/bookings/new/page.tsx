import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CustomerBookingLoading } from "@/components/customer/customer-booking-loading";
import { CustomerBookingForm } from "@/components/customer/customer-booking-form";
import { getCustomerBookingUser } from "@/lib/customer-booking";

export default function NewCustomerBookingPage() {
  return (
    <Suspense
      fallback={<CustomerBookingLoading message="Loading your profile…" />}
    >
      <NewCustomerBookingContent />
    </Suspense>
  );
}

async function NewCustomerBookingContent() {
  const customer = await getCustomerBookingUser();
  if (!customer) {
    redirect("/login?role=customer");
  }

  return (
    <CustomerBookingForm
      profile={{
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      }}
    />
  );
}
