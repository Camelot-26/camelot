import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { getAuth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const instant = false;

const activeEnquiryStatuses = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "FOLLOW_UP_REQUIRED",
] as const;

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function AgentDashboardPage() {
  return (
    <Suspense fallback={<div className="agent-dashboard-loading" role="status">Loading your agent overview…</div>}>
      <AgentDashboardContent />
    </Suspense>
  );
}

async function AgentDashboardContent() {
  await connection();
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;

  const agentId = session.user.id;
  const prisma = getPrisma();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [activeEnquiries, followups, assignedBookings, upcomingEvents, recentEnquiries] =
    await Promise.all([
      prisma.enquiry.count({
        where: { assignedAgentId: agentId, deletedAt: null, status: { in: [...activeEnquiryStatuses] } },
      }),
      prisma.enquiry.count({
        where: { assignedAgentId: agentId, deletedAt: null, status: "FOLLOW_UP_REQUIRED" },
      }),
      prisma.booking.count({
        where: { assignedAgentId: agentId, deletedAt: null, status: { in: ["PENDING", "CONFIRMED"] } },
      }),
      prisma.event.count({
        where: { assignedAgentId: agentId, deletedAt: null, eventDate: { gte: today } },
      }),
      prisma.enquiry.findMany({
        where: { assignedAgentId: agentId, deletedAt: null },
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        take: 5,
        select: {
          id: true,
          enquiryNumber: true,
          customerName: true,
          subject: true,
          status: true,
          priority: true,
          updatedAt: true,
        },
      }),
    ]);

  const firstName = session.user.name.trim().split(/\s+/)[0] || "there";

  return (
    <div className="agent-dashboard">
      <section className="agent-dashboard-welcome">
        <div>
          <p className="eyebrow">AGENT OVERVIEW</p>
          <h1>Welcome back, <em>{firstName}.</em></h1>
          <p>Your guest conversations and upcoming work, all in one place.</p>
        </div>
        <Link className="button button-dark" href="/agent/enquiries">Open enquiries <span aria-hidden="true">↗</span></Link>
      </section>

      <section aria-label="Your current workload" className="agent-stat-grid">
        <Link className="agent-stat-card" href="/agent/enquiries">
          <span className="agent-stat-label">Active enquiries</span>
          <strong>{activeEnquiries}</strong>
          <span className="agent-stat-detail">Guest conversations to progress</span>
        </Link>
        <Link className="agent-stat-card agent-stat-highlight" href="/agent/enquiries">
          <span className="agent-stat-label">Follow-up needed</span>
          <strong>{followups}</strong>
          <span className="agent-stat-detail">Enquiries flagged for a response</span>
        </Link>
        <div className="agent-stat-card">
          <span className="agent-stat-label">Active bookings</span>
          <strong>{assignedBookings}</strong>
          <span className="agent-stat-detail">Pending or confirmed reservations</span>
        </div>
        <div className="agent-stat-card">
          <span className="agent-stat-label">Upcoming events</span>
          <strong>{upcomingEvents}</strong>
          <span className="agent-stat-detail">Events assigned to you</span>
        </div>
      </section>

      <div className="agent-dashboard-grid">
        <section aria-labelledby="agent-enquiries-title" className="agent-dashboard-panel">
          <div className="agent-panel-heading">
            <div><p className="eyebrow">NEEDS YOUR ATTENTION</p><h2 id="agent-enquiries-title">Recent enquiries</h2></div>
            <Link href="/agent/enquiries">View all <span aria-hidden="true">→</span></Link>
          </div>
          {recentEnquiries.length ? (
            <div className="agent-enquiry-list">
              {recentEnquiries.map((enquiry) => (
                <article className="agent-enquiry-row" key={enquiry.id}>
                  <span className={`agent-priority agent-priority-${enquiry.priority.toLowerCase()}`} aria-label={`${enquiry.priority.toLowerCase()} priority`} />
                  <div className="agent-enquiry-copy">
                    <strong>{enquiry.customerName}</strong>
                    <span>{enquiry.subject}</span>
                  </div>
                  <span className="agent-enquiry-status">{enquiry.status.replaceAll("_", " ").toLowerCase()}</span>
                  <time dateTime={enquiry.updatedAt.toISOString()}>{formatDate(enquiry.updatedAt)}</time>
                </article>
              ))}
            </div>
          ) : (
            <div className="agent-empty-state">
              <span aria-hidden="true">✦</span>
              <h3>You’re all caught up</h3>
              <p>New enquiries assigned to you will appear here.</p>
            </div>
          )}
        </section>

        <aside className="agent-dashboard-panel agent-quick-panel">
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h2>Quick links</h2>
          <Link href="/agent/enquiries"><span className="agent-quick-mark" aria-hidden="true">01</span><span><strong>Guest enquiries</strong><small>Review and follow up on requests.</small></span><span aria-hidden="true">↗</span></Link>
          <Link href="/agent/referrals"><span className="agent-quick-mark" aria-hidden="true">02</span><span><strong>Referrals</strong><small>See the guests you’ve introduced.</small></span><span aria-hidden="true">↗</span></Link>
        </aside>
      </div>
      <footer className="agent-dashboard-footer"><span><i aria-hidden="true" /> Assigned work is up to date</span><span>Have a great day with Camelot.</span></footer>
    </div>
  );
}
