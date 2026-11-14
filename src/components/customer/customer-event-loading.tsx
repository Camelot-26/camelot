export function CustomerEventLoading({ message }: { message: string }) {
  return (
    <section aria-live="polite" className="customer-events-page">
      <header className="admin-bookings-header">
        <div>
          <p className="eyebrow">Customer events</p>
          <h1>My Events</h1>
          <p>{message}</p>
        </div>
      </header>
    </section>
  );
}
