"use client";

export default function CustomerBookingsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="admin-bookings-page customer-bookings-page">
      <div className="admin-directory-error" role="alert">
        <p>Your bookings could not be loaded. Please try again.</p>
        <button className="admin-directory-action" onClick={reset} type="button">
          Retry
        </button>
      </div>
    </section>
  );
}
