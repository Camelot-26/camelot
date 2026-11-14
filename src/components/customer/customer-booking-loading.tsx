export function CustomerBookingLoading({ message }: { message: string }) {
  return (
    <section className="admin-bookings-page customer-bookings-page">
      <div className="admin-directory-loading" role="status">
        {message}
      </div>
    </section>
  );
}
