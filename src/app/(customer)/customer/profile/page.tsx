import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CustomerProfileForm } from "@/components/customer/customer-profile-form";
import { getCustomerBookingUser } from "@/lib/customer-booking";

export default function CustomerProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="customer-profile-page">
          <p role="status">Loading your profile…</p>
        </div>
      }
    >
      <CustomerProfileContent />
    </Suspense>
  );
}

async function CustomerProfileContent() {
  const customer = await getCustomerBookingUser();
  if (!customer) redirect("/login?role=customer");

  return (
    <div className="customer-profile-page">
      <CustomerProfileForm
        email={customer.email}
        image={customer.image}
        name={customer.name}
        phone={customer.phone}
      />
    </div>
  );
}
