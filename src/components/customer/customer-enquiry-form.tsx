"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCustomerEnquiry } from "@/app/(customer)/customer/enquiries/actions";
import { customerEnquiryTypes } from "@/lib/enquiry-constants";

export function CustomerEnquiryForm({
  profile,
}: {
  profile: { name: string; email: string; phone: string | null };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await createCustomerEnquiry({
        subject: String(formData.get("subject") ?? ""),
        enquiryType: String(formData.get("enquiryType") ?? ""),
        description: String(formData.get("description") ?? ""),
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.push(`/customer/enquiries/${result.enquiryId}`);
    } catch (actionError) {
      console.error("Could not create a customer enquiry.", actionError);
      setError("Your enquiry could not be submitted. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-enquiries-page customer-enquiries-page">
      <header className="admin-enquiries-header">
        <div>
          <p className="eyebrow">Get in touch</p>
          <h1>New enquiry</h1>
          <p>Send your question to the Camelot team.</p>
        </div>
      </header>
      <form className="customer-enquiry-form" onSubmit={submit}>
        <fieldset className="customer-booking-contact">
          <legend>Your contact details</legend>
          <label>
            Customer name
            <input readOnly value={profile.name} />
          </label>
          <label>
            Email
            <input readOnly type="email" value={profile.email} />
          </label>
          <label>
            Phone number
            <input
              readOnly
              value={profile.phone ?? "No phone number on profile"}
            />
          </label>
          <p>Contact details are taken from your customer profile.</p>
        </fieldset>
        <div className="customer-enquiry-form-grid">
          <label>
            Enquiry subject
            <input maxLength={180} name="subject" required />
          </label>
          <label>
            Enquiry type
            <select
              defaultValue={customerEnquiryTypes[0].value}
              name="enquiryType"
              required
            >
              {customerEnquiryTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Enquiry description
          <textarea maxLength={10000} name="description" required />
        </label>
        {error && (
          <p className="admin-directory-error" role="alert">
            {error}
          </p>
        )}
        <div className="customer-enquiry-form-actions">
          <Link className="admin-modal-secondary" href="/customer/enquiries">
            Back to my enquiries
          </Link>
          <button className="button button-dark" disabled={busy} type="submit">
            {busy ? "Submitting…" : "Submit enquiry"}
          </button>
        </div>
      </form>
    </section>
  );
}
