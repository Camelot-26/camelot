import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CustomerEnquiryForm } from "@/components/customer/customer-enquiry-form";
import { CustomerEnquiryLoading } from "@/components/customer/customer-enquiry-loading";
import { getCustomerBookingUser } from "@/lib/customer-booking";

export default function NewCustomerEnquiryPage() {
  return (
    <Suspense
      fallback={<CustomerEnquiryLoading message="Loading your profile…" />}
    >
      <NewCustomerEnquiryContent />
    </Suspense>
  );
}

async function NewCustomerEnquiryContent() {
  const customer = await getCustomerBookingUser();
  if (!customer) {
    redirect("/login?role=customer");
  }
  return (
    <CustomerEnquiryForm
      profile={{
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      }}
    />
  );
}
