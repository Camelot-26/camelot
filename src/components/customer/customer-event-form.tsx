"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCustomerEventRequest } from "@/app/(customer)/customer/events/actions";

type EventCategoryOption = { id: string; name: string };

export function CustomerEventForm({
  categories,
  profile,
}: {
  categories: EventCategoryOption[];
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
      const result = await createCustomerEventRequest({
        eventName: String(formData.get("eventName") ?? ""),
        categoryId: String(formData.get("categoryId") ?? ""),
        eventDescription: String(formData.get("eventDescription") ?? ""),
        preferredDate: String(formData.get("preferredDate") ?? ""),
        preferredStartTime: String(formData.get("preferredStartTime") ?? ""),
        preferredEndTime: String(formData.get("preferredEndTime") ?? ""),
        companyName: String(formData.get("companyName") ?? ""),
        expectedGuests: Number(formData.get("expectedGuests")),
        adults: Number(formData.get("adults")),
        children: Number(formData.get("children")),
        seatingArrangement: String(formData.get("seatingArrangement") ?? ""),
        foodBeverageRequirements: String(formData.get("foodBeverageRequirements") ?? ""),
        decorationRequirements: String(formData.get("decorationRequirements") ?? ""),
        entertainmentRequirements: String(formData.get("entertainmentRequirements") ?? ""),
        specialRequirements: String(formData.get("specialRequirements") ?? ""),
        additionalNotes: String(formData.get("additionalNotes") ?? ""),
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.push(`/customer/events/${result.enquiryId}`);
    } catch (actionError) {
      console.error("Could not submit a customer event request.", actionError);
      setError("Your event request could not be submitted. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-bookings-page customer-events-page">
      <header className="admin-bookings-header">
        <div>
          <p className="eyebrow">Plan something memorable</p>
          <h1>Submit an event request</h1>
          <p>
            Send your preferred details to our team. This request is not a
            confirmed event.
          </p>
        </div>
      </header>
      <form className="customer-event-form" onSubmit={submit}>
        <fieldset>
          <legend>Event information</legend>
          <div className="customer-event-form-grid">
            <label>
              Event name
              <input maxLength={180} name="eventName" required />
            </label>
            <label>
              Event category
              <select defaultValue="" name="categoryId" required>
                <option disabled value="">
                  Select a category
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Preferred event date
              <input name="preferredDate" required type="date" />
            </label>
            <label>
              Preferred start time
              <input name="preferredStartTime" required type="time" />
            </label>
            <label>
              Preferred end time
              <input name="preferredEndTime" required type="time" />
            </label>
          </div>
          <label>
            Event description
            <textarea maxLength={5000} name="eventDescription" required />
          </label>
        </fieldset>

        <fieldset className="customer-event-contact">
          <legend>Customer information</legend>
          <div className="customer-event-form-grid">
            <label>
              Customer name
              <input readOnly value={profile.name} />
            </label>
            <label>
              Email address
              <input readOnly type="email" value={profile.email} />
            </label>
            <label>
              Contact number
              <input readOnly value={profile.phone ?? "No phone number on profile"} />
            </label>
            <label>
              Company name (optional)
              <input maxLength={200} name="companyName" />
            </label>
          </div>
          <p>Contact details are taken from your customer profile.</p>
        </fieldset>

        <fieldset>
          <legend>Guest information</legend>
          <div className="customer-event-form-grid">
            <label>
              Expected number of guests
              <input defaultValue={1} min={1} name="expectedGuests" required type="number" />
            </label>
            <label>
              Adults
              <input defaultValue={1} min={0} name="adults" required type="number" />
            </label>
            <label>
              Children
              <input defaultValue={0} min={0} name="children" required type="number" />
            </label>
            <label>
              Preferred seating arrangement
              <input maxLength={1000} name="seatingArrangement" />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Event requirements</legend>
          <label>
            Food and beverage requirements
            <textarea maxLength={2000} name="foodBeverageRequirements" />
          </label>
          <label>
            Decoration requirements
            <textarea maxLength={2000} name="decorationRequirements" />
          </label>
          <label>
            Entertainment requirements
            <textarea maxLength={2000} name="entertainmentRequirements" />
          </label>
          <label>
            Special requirements
            <textarea maxLength={2000} name="specialRequirements" />
          </label>
          <label>
            Additional notes
            <textarea maxLength={2000} name="additionalNotes" />
          </label>
        </fieldset>

        {!categories.length && (
          <p className="admin-directory-error" role="alert">
            Event requests are temporarily unavailable because there are no
            active event categories.
          </p>
        )}
        {error && (
          <p className="admin-directory-error" role="alert">
            {error}
          </p>
        )}
        <div className="customer-event-form-actions">
          <Link className="admin-modal-secondary" href="/customer/events">
            Back to my events
          </Link>
          <button
            className="button button-dark"
            disabled={busy || categories.length === 0}
            type="submit"
          >
            {busy ? "Submitting…" : "Submit event request"}
          </button>
        </div>
      </form>
    </section>
  );
}
