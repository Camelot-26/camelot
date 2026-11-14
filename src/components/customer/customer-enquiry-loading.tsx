export function CustomerEnquiryLoading({ message }: { message: string }) {
  return (
    <section className="admin-enquiries-page customer-enquiries-page">
      <div className="admin-directory-loading" role="status">
        {message}
      </div>
    </section>
  );
}
