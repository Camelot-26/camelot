"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCustomerBooking } from "@/app/(customer)/customer/bookings/actions";
import { bookingTypes } from "@/lib/booking-constants";

export function CustomerBookingForm({
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
      const result = await createCustomerBooking({
        bookingType: String(formData.get("bookingType") ?? ""),
        bookingDate: String(formData.get("bookingDate") ?? ""),
        bookingTime: String(formData.get("bookingTime") ?? ""),
        adults: Number(formData.get("adults")),
        children: Number(formData.get("children")),
        occasion: String(formData.get("occasion") ?? ""),
        specialRequests: String(formData.get("specialRequests") ?? ""),
        additionalNotes: String(formData.get("additionalNotes") ?? ""),
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.push(`/customer/bookings/${result.bookingId}`);
    } catch (actionError) {
      console.error("Could not create a customer booking.", actionError);
      setError("Your booking request could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-bookings-page customer-bookings-page">
      <header className="admin-bookings-header">
        <div>
          <p className="eyebrow">Your visits</p>
          <h1>Request a booking</h1>
          <p>Send your preferred details to the Camelot team for confirmation.</p>
        </div>
      </header>
      <form
        className="customer-booking-form admin-booking-form"
        onSubmit={submit}
      >
        <fieldset className="customer-booking-contact">
          <legend>Your contact details</legend>
          <label>
            Name
            <input readOnly value={profile.name} />
          </label>
          <label>
            Email
            <input readOnly type="email" value={profile.email} />
          </label>
          <label>
            Phone
            <input readOnly value={profile.phone ?? "No phone number on profile"} />
          </label>
          <p>Contact details are taken from your customer profile.</p>
        </fieldset>

        <div className="customer-booking-form-grid">
          <label>
            Booking type
            <select defaultValue={bookingTypes[0]} name="bookingType" required>
              {bookingTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Booking date
            <input name="bookingDate" required type="date" />
          </label>
          <label>
            Preferred booking time
            <input name="bookingTime" required type="time" />
          </label>
          <label>
            Number of adults
            <input defaultValue={1} min={1} name="adults" required type="number" />
          </label>
          <label>
            Number of children
            <input defaultValue={0} min={0} name="children" required type="number" />
          </label>
          <label>
            Occasion
            <input maxLength={100} name="occasion" />
          </label>
        </div>
        <label>
          Special requests
          <textarea maxLength={2000} name="specialRequests" />
        </label>
        <label>
          Additional notes
          <textarea maxLength={2000} name="additionalNotes" />
        </label>
        {error && (
          <p className="admin-directory-error" role="alert">
            {error}
          </p>
        )}
        <div className="customer-booking-form-actions">
          <Link className="admin-modal-secondary" href="/customer/bookings">
            Back to my bookings
          </Link>
          <button className="button button-dark" disabled={busy} type="submit">
            {busy ? "Sending request…" : "Submit booking request"}
          </button>
        </div>
      </form>
    </section>
  );
}
