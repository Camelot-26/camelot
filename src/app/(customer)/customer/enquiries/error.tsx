"use client";

export default function CustomerEnquiriesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="admin-enquiries-page customer-enquiries-page">
      <div className="admin-directory-error" role="alert">
        <p>Your enquiries could not be loaded. Please try again.</p>
        <button className="admin-directory-action" onClick={reset} type="button">
          Retry
        </button>
      </div>
    </section>
  );
}
