export const instant = false;

export default function AdminUnauthorizedPage() {
  return (
    <section className="admin-users-page">
      <header className="admin-users-header">
        <div>
          <p className="eyebrow">Access restricted</p>
          <h1>You don’t have permission to view this section</h1>
          <p>
            Your administrator account is active, but its assigned role does not
            grant access to this section. Contact a full administrator if you
            need access.
          </p>
        </div>
      </header>
    </section>
  );
}
