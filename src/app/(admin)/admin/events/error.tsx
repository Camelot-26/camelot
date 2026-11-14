"use client";

export default function AdminEventsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="admin-bookings-page" role="alert">
      <p className="eyebrow">Operations</p>
      <h1>Events could not be loaded</h1>
      <p>Please retry. If the problem persists, contact your system administrator.</p>
      <button className="button button-dark" onClick={reset} type="button">
        Try again
      </button>
    </section>
  );
}
