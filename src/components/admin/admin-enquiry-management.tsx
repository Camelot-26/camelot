"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  completeFollowup,
  convertEnquiryToBooking,
  deleteEnquiry,
  replyToCustomerEnquiry,
  saveEnquiry,
  scheduleFollowup,
} from "@/app/(admin)/admin/enquiries/actions";
import { convertCustomerEventRequest } from "@/app/(admin)/admin/events/actions";
import {
  enquiryPriorities,
  enquirySources,
  enquiryStatuses,
  enquiryTypes,
  type EnquiryInput,
  type EnquiryPriorityValue,
  type EnquiryStatusValue,
} from "@/lib/enquiry-constants";
import {
  formatCustomerEventRequest,
  parseCustomerEventRequest,
} from "@/lib/customer-event-requests";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

type Agent = { id: string; name: string; email: string };
type EventCategory = { id: string; name: string };

type Followup = {
  id: string;
  scheduledDate: string;
  scheduledTime: string | null;
  notes: string | null;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  completedAt: string | null;
  createdAt: string;
};

type Enquiry = {
  id: string;
  enquiryNumber: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  subject: string;
  enquiryType: string;
  description: string;
  eventCategoryId: string | null;
  preferredEventDate: string | null;
  eventExpectedGuests: number | null;
  source: string;
  priority: EnquiryPriorityValue;
  status: EnquiryStatusValue;
  assignedAgentId: string | null;
  assignedById: string | null;
  assignedAt: string | null;
  internalNotes: string | null;
  nextFollowUpAt: string | null;
  convertedBookingId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  customer: Customer | null;
  assignedAgent: Agent | null;
  assignedBy: { name: string } | null;
  createdBy: { name: string };
  convertedBooking: { id: string; bookingNumber: string } | null;
  events: { id: string; eventNumber: string; name: string; status: string }[];
  followups: Followup[];
  statusHistory: {
    id: string;
    previousStatus: EnquiryStatusValue | null;
    newStatus: EnquiryStatusValue;
    remarks: string | null;
    createdAt: string;
    changedBy: { name: string } | null;
  }[];
  activities: {
    id: string;
    activityType: string;
    description: string;
    createdAt: string;
    createdBy: { name: string } | null;
  }[];
};

type Filters = {
  q: string;
  status: string;
  priority: string;
  type: string;
  followup: string;
  agent: string;
  date: string;
  sort: "createdAt" | "nextFollowUpAt";
  direction: "asc" | "desc";
  page: number;
  pageSize: number;
};

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function displayDate(value: string, month: "short" | "long" = "short") {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  return date.toLocaleDateString("en-US", {
    month,
    day: "numeric",
    year: "numeric",
  });
}

function displayDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isOverdue(date: string) {
  return new Date(`${date}T23:59:59`).getTime() < Date.now();
}

function enquiryFormValues(formData: FormData, editing: Enquiry | null): EnquiryInput {
  return {
    ...(editing ? { id: editing.id } : {}),
    customerId: String(formData.get("customerId") ?? ""),
    customerName: String(formData.get("customerName") ?? ""),
    customerEmail: String(formData.get("customerEmail") ?? ""),
    customerPhone: String(formData.get("customerPhone") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    enquiryType: String(formData.get("enquiryType") ?? ""),
    description: String(formData.get("description") ?? ""),
    source: String(formData.get("source") ?? ""),
    priority: String(formData.get("priority") ?? ""),
    status: String(formData.get("status") ?? ""),
    assignedAgentId: String(formData.get("assignedAgentId") ?? ""),
    internalNotes: String(formData.get("internalNotes") ?? ""),
    statusRemarks: String(formData.get("statusRemarks") ?? ""),
  };
}

export function AdminEnquiryManagement({
  agents,
  customers,
  eventCategories,
  enquiries,
  filters,
  pageCount,
  total,
  upcomingFollowups,
  overdueFollowups,
}: {
  agents: Agent[];
  customers: Customer[];
  eventCategories: EventCategory[];
  enquiries: Enquiry[];
  filters: Filters;
  pageCount: number;
  total: number;
  upcomingFollowups: number;
  overdueFollowups: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [editing, setEditing] = useState<Enquiry | null | undefined>(undefined);
  const [viewing, setViewing] = useState<Enquiry | null>(null);
  const [converting, setConverting] = useState<Enquiry | null>(null);
  const [convertingEvent, setConvertingEvent] = useState<Enquiry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const viewingEventRequest = viewing
    ? parseCustomerEventRequest(viewing.description)
    : null;
  const editingEventRequest = editing
    ? parseCustomerEventRequest(editing.description)
    : null;
  const convertingEventDetails = convertingEvent
    ? parseCustomerEventRequest(convertingEvent.description)
    : null;

  function navigateParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value === "") params.delete(key);
      else params.set(key, String(value));
    }
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    navigateParams({
      q: String(data.get("q") ?? "").trim(),
      status: String(data.get("status") ?? ""),
      priority: String(data.get("priority") ?? ""),
      type: String(data.get("type") ?? ""),
      followup: String(data.get("followup") ?? ""),
      agent: String(data.get("agent") ?? ""),
      date: String(data.get("date") ?? ""),
      page: 1,
    });
  }

  async function submitEnquiry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await saveEnquiry(
        enquiryFormValues(new FormData(event.currentTarget), editing ?? null),
      );
      if (!result.success) {
        setError(result.message);
        return;
      }
      setEditing(undefined);
      setNotice(
        result.enquiryNumber
          ? `Enquiry ${result.enquiryNumber} created.`
          : "Enquiry updated.",
      );
      router.refresh();
    } catch (actionError) {
      console.error("Could not save an admin enquiry.", actionError);
      setError("The enquiry could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeEnquiry(enquiry: Enquiry) {
    if (
      !window.confirm(
        `Delete enquiry ${enquiry.enquiryNumber}? It will be removed from the active list.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await deleteEnquiry(enquiry.id);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setViewing(null);
      setNotice(`Enquiry ${enquiry.enquiryNumber} deleted.`);
      router.refresh();
    } catch (actionError) {
      console.error("Could not delete an admin enquiry.", actionError);
      setError("The enquiry could not be deleted. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function createFollowup(
    event: React.FormEvent<HTMLFormElement>,
    replaceFollowupId?: string,
  ) {
    event.preventDefault();
    if (!viewing) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await scheduleFollowup({
        enquiryId: viewing.id,
        date: String(data.get("date") ?? ""),
        time: String(data.get("time") ?? ""),
        notes: String(data.get("notes") ?? ""),
        ...(replaceFollowupId ? { replaceFollowupId } : {}),
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setViewing(null);
      setNotice(replaceFollowupId ? "Follow-up rescheduled." : "Follow-up scheduled.");
      router.refresh();
    } catch (actionError) {
      console.error("Could not schedule an enquiry follow-up.", actionError);
      setError("The follow-up could not be scheduled. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function markFollowupComplete(followup: Followup) {
    if (!viewing) return;
    setBusy(true);
    setError("");
    try {
      const result = await completeFollowup({
        enquiryId: viewing.id,
        followupId: followup.id,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setViewing(null);
      setNotice("Follow-up marked complete.");
      router.refresh();
    } catch (actionError) {
      console.error("Could not complete an enquiry follow-up.", actionError);
      setError("The follow-up could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function convertToBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!converting) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await convertEnquiryToBooking({
        enquiryId: converting.id,
        customerId: String(data.get("customerId") ?? ""),
        bookingDate: String(data.get("bookingDate") ?? ""),
        bookingTime: String(data.get("bookingTime") ?? ""),
        adults: Number(data.get("adults")),
        children: Number(data.get("children")),
        assignedAgentId: String(data.get("assignedAgentId") ?? ""),
        occasion: String(data.get("occasion") ?? ""),
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setConverting(null);
      setViewing(null);
      setNotice(`Converted to booking ${result.bookingNumber}.`);
      router.refresh();
    } catch (actionError) {
      console.error("Could not convert an enquiry to a booking.", actionError);
      setError("The enquiry could not be converted. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function convertToEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!convertingEvent) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await convertCustomerEventRequest({
        enquiryId: convertingEvent.id,
        categoryId: String(data.get("categoryId") ?? ""),
        eventDate: String(data.get("eventDate") ?? ""),
        setupStartTime: String(data.get("setupStartTime") ?? ""),
        startTime: String(data.get("startTime") ?? ""),
        endTime: String(data.get("endTime") ?? ""),
        cleanupEndTime: String(data.get("cleanupEndTime") ?? ""),
        venue: String(data.get("venue") ?? ""),
        contactNumber: String(data.get("contactNumber") ?? ""),
        venueCapacity: String(data.get("venueCapacity") ?? "")
          ? Number(data.get("venueCapacity"))
          : null,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setConvertingEvent(null);
      setViewing(null);
      setNotice(`Created draft event ${result.eventNumber}. It is not confirmed.`);
      router.refresh();
    } catch (actionError) {
      console.error("Could not convert an event request to a draft event.", actionError);
      setError("The event request could not be converted. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function respondToCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!viewing) return;
    const formData = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await replyToCustomerEnquiry({
        enquiryId: viewing.id,
        message: String(formData.get("message") ?? ""),
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setViewing(null);
      setNotice(`Response sent for ${viewing.enquiryNumber}.`);
      router.refresh();
    } catch (actionError) {
      console.error("Could not send an enquiry response.", actionError);
      setError("The response could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function sortBy(sort: Filters["sort"]) {
    navigateParams({
      sort,
      direction:
        filters.sort === sort && filters.direction === "desc" ? "asc" : "desc",
      page: 1,
    });
  }

  return (
    <section className="admin-enquiries-page">
      <header className="admin-enquiries-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Enquiry management</h1>
          <p>Manage guest requests, assignments, and follow-ups.</p>
        </div>
        <button
          className="button button-dark admin-booking-create"
          onClick={() => {
            setError("");
            setEditing(null);
          }}
          type="button"
        >
          Add enquiry
        </button>
      </header>

      <div className="admin-enquiry-followup-summary">
        <button
          className={`admin-enquiry-followup-card${filters.followup === "upcoming" ? " is-active" : ""}`}
          onClick={() =>
            navigateParams({
              followup: filters.followup === "upcoming" ? "" : "upcoming",
              page: 1,
            })
          }
          type="button"
        >
          <span>Upcoming follow-ups</span>
          <strong>{upcomingFollowups}</strong>
        </button>
        <button
          className={`admin-enquiry-followup-card is-overdue${filters.followup === "overdue" ? " is-active" : ""}`}
          onClick={() =>
            navigateParams({
              followup: filters.followup === "overdue" ? "" : "overdue",
              page: 1,
            })
          }
          type="button"
        >
          <span>Overdue follow-ups</span>
          <strong>{overdueFollowups}</strong>
        </button>
      </div>

      {notice && (
        <p aria-live="polite" className="admin-booking-notice">
          {notice}
          <button
            aria-label="Dismiss"
            onClick={() => setNotice("")}
            type="button"
          >
            ×
          </button>
        </p>
      )}
      {error && editing === undefined && !viewing && !converting && (
        <p className="admin-directory-error" role="alert">
          {error}
          <button
            aria-label="Dismiss"
            onClick={() => setError("")}
            type="button"
          >
            ×
          </button>
        </p>
      )}

      <section aria-label="Enquiries" className="admin-enquiries-panel">
        <form className="admin-enquiries-filters" onSubmit={applyFilters}>
          <label className="admin-directory-search">
            <span className="sr-only">Search enquiries</span>
            <span aria-hidden="true">⌕</span>
            <input
              defaultValue={filters.q}
              name="q"
              placeholder="Enquiry ID, name, email or phone"
              type="search"
            />
          </label>
          <label>
            <span className="sr-only">Filter by enquiry type</span>
            <select defaultValue={filters.type} name="type">
              <option value="">All types</option>
              {enquiryTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by enquiry status</span>
            <select defaultValue={filters.status} name="status">
              <option value="">All statuses</option>
              {enquiryStatuses.map((status) => (
                <option key={status} value={status}>
                  {humanize(status)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by priority</span>
            <select defaultValue={filters.priority} name="priority">
              <option value="">All priorities</option>
              {enquiryPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {humanize(priority)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by assigned Agent</span>
            <select defaultValue={filters.agent} name="agent">
              <option value="">All Agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by enquiry date</span>
            <input
              aria-label="Filter by enquiry date"
              defaultValue={filters.date}
              name="date"
              type="date"
            />
          </label>
          <label>
            <span className="sr-only">Filter by follow-up schedule</span>
            <select defaultValue={filters.followup} name="followup">
              <option value="">All follow-ups</option>
              <option value="upcoming">Upcoming follow-ups</option>
              <option value="overdue">Overdue follow-ups</option>
            </select>
          </label>
          <button className="admin-booking-filter-submit" type="submit">
            Apply filters
          </button>
          <span className="admin-directory-count">
            {total} {total === 1 ? "enquiry" : "enquiries"}
          </span>
        </form>

        {enquiries.length ? (
          <div className="admin-enquiries-table-wrap">
            <table className="admin-directory-table admin-enquiries-table">
              <thead>
                <tr>
                  <th scope="col">Enquiry ID</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Email / Contact</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Type / Source</th>
                  <th scope="col">Assigned Agent</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Status</th>
                  <th
                    aria-sort={
                      filters.sort === "nextFollowUpAt"
                        ? filters.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    scope="col"
                  >
                    <button
                      className="admin-booking-sort"
                      onClick={() => sortBy("nextFollowUpAt")}
                      type="button"
                    >
                      Next follow-up
                      {filters.sort === "nextFollowUpAt"
                        ? filters.direction === "asc"
                          ? " ↑"
                          : " ↓"
                        : ""}
                    </button>
                  </th>
                  <th
                    aria-sort={
                      filters.sort === "createdAt"
                        ? filters.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    scope="col"
                  >
                    <button
                      className="admin-booking-sort"
                      onClick={() => sortBy("createdAt")}
                      type="button"
                    >
                      Created date
                      {filters.sort === "createdAt"
                        ? filters.direction === "asc"
                          ? " ↑"
                          : " ↓"
                        : ""}
                    </button>
                  </th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enquiry) => {
                  const nextFollowup = enquiry.followups.find(
                    (followup) => followup.status === "SCHEDULED",
                  );
                  const overdue =
                    !!nextFollowup && isOverdue(nextFollowup.scheduledDate);
                  return (
                    <tr key={enquiry.id}>
                      <td>
                        <strong>{enquiry.enquiryNumber}</strong>
                      </td>
                      <td>{enquiry.customerName}</td>
                      <td>
                        {enquiry.customerEmail || "—"}
                        <span className="admin-enquiry-cell-subtitle">
                          {enquiry.customerPhone || "No phone"}
                        </span>
                      </td>
                      <td className="admin-enquiry-subject">{enquiry.subject}</td>
                      <td>
                        {enquiry.enquiryType}
                        <span className="admin-enquiry-cell-subtitle">
                          {enquiry.source}
                        </span>
                      </td>
                      <td>{enquiry.assignedAgent?.name ?? "—"}</td>
                      <td>
                        <span
                          className={`enquiry-priority enquiry-priority-${enquiry.priority.toLowerCase()}`}
                        >
                          {humanize(enquiry.priority)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`enquiry-status enquiry-status-${enquiry.status.toLowerCase().replaceAll("_", "-")}`}
                        >
                          {humanize(enquiry.status)}
                        </span>
                      </td>
                      <td>
                        {nextFollowup ? (
                          <span className={overdue ? "is-overdue-text" : ""}>
                            {displayDate(nextFollowup.scheduledDate)}
                            <span className="admin-enquiry-cell-subtitle">
                              {nextFollowup.scheduledTime || "Time not set"}
                              {overdue ? " · Overdue" : ""}
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{displayDate(enquiry.createdAt)}</td>
                      <td>
                        <div className="admin-directory-actions">
                          <button
                            className="admin-directory-action"
                            onClick={() => {
                              setError("");
                              setViewing(enquiry);
                            }}
                            type="button"
                          >
                            View
                          </button>
                          <button
                            className="admin-directory-action"
                            onClick={() => {
                              setError("");
                              setEditing(enquiry);
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className="admin-directory-action admin-booking-delete"
                            disabled={busy}
                            onClick={() => void removeEnquiry(enquiry)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-directory-empty">
            <h2>{total ? "No enquiries on this page" : "No enquiries found"}</h2>
            <p>
              {total
                ? "Try another page or adjust your filters."
                : "Add an enquiry or change the filters to see matching requests."}
            </p>
          </div>
        )}

        <footer className="admin-directory-pagination">
          <label>
            Records per page
            <select
              onChange={(event) =>
                navigateParams({ pageSize: event.target.value, page: 1 })
              }
              value={filters.pageSize}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <span aria-live="polite" className="admin-directory-page-range">
            Showing {total ? (filters.page - 1) * filters.pageSize + 1 : 0}–
            {Math.min(filters.page * filters.pageSize, total)} of {total}
          </span>
          <div className="admin-directory-page-navigation">
            <span>
              Page {filters.page} of {pageCount}
            </span>
            <button
              disabled={filters.page <= 1}
              onClick={() => navigateParams({ page: filters.page - 1 })}
              type="button"
            >
              Previous
            </button>
            <button
              disabled={filters.page >= pageCount}
              onClick={() => navigateParams({ page: filters.page + 1 })}
              type="button"
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      {editing !== undefined && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setEditing(undefined);
              setError("");
            }
          }}
        >
          <section
            aria-labelledby="admin-enquiry-edit-title"
            aria-modal="true"
            className="admin-modal admin-enquiry-modal"
            role="dialog"
          >
            <div className="admin-modal-heading">
              <div>
                <p className="eyebrow">Enquiry information</p>
                <h2 id="admin-enquiry-edit-title">
                  {editing ? `Edit ${editing.enquiryNumber}` : "Add enquiry"}
                </h2>
              </div>
              <button
                aria-label="Close enquiry form"
                className="admin-modal-close"
                disabled={busy}
                onClick={() => setEditing(undefined)}
                type="button"
              >
                ×
              </button>
            </div>
            <form
              className="admin-user-edit-form admin-enquiry-form"
              key={editing?.id ?? "new-enquiry"}
              onSubmit={submitEnquiry}
            >
              {editingEventRequest && editing ? (
                <>
                  <input
                    name="customerId"
                    type="hidden"
                    value={editing.customerId ?? ""}
                  />
                  <p className="admin-enquiry-conversion-summary">
                    Customer identity is linked to the authenticated customer profile.
                  </p>
                </>
              ) : (
                <label>
                  Link existing customer (optional)
                  <select
                    defaultValue={editing?.customerId ?? ""}
                    name="customerId"
                  >
                    <option value="">Not registered / no linked account</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} · {customer.email}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="admin-enquiry-form-grid">
                <label>
                  Customer name
                  <input
                    defaultValue={editing?.customerName ?? ""}
                    maxLength={120}
                    name="customerName"
                    readOnly={!!editingEventRequest}
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    defaultValue={editing?.customerEmail ?? ""}
                    maxLength={254}
                    name="customerEmail"
                    readOnly={!!editingEventRequest}
                    type="email"
                  />
                </label>
                <label>
                  Contact number
                  <input
                    defaultValue={editing?.customerPhone ?? ""}
                    maxLength={40}
                    name="customerPhone"
                    readOnly={!!editingEventRequest}
                    type="tel"
                  />
                </label>
                <label>
                  Enquiry subject
                  <input
                    defaultValue={editing?.subject ?? ""}
                    maxLength={180}
                    name="subject"
                    readOnly={!!editingEventRequest}
                    required
                  />
                </label>
                <label>
                  Enquiry type
                  {editingEventRequest ? (
                    <input
                      name="enquiryType"
                      readOnly
                      required
                      value={editing?.enquiryType ?? ""}
                    />
                  ) : (
                    <select
                      defaultValue={editing?.enquiryType ?? enquiryTypes[0]}
                      name="enquiryType"
                      required
                    >
                      {enquiryTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
                <label>
                  Enquiry source
                  {editingEventRequest ? (
                    <input
                      name="source"
                      readOnly
                      required
                      value={editing?.source ?? ""}
                    />
                  ) : (
                    <select
                      defaultValue={editing?.source ?? enquirySources[0]}
                      name="source"
                      required
                    >
                      {enquirySources.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
                <label>
                  Priority
                  <select
                    defaultValue={editing?.priority ?? "MEDIUM"}
                    name="priority"
                    required
                  >
                    {enquiryPriorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {humanize(priority)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select
                    defaultValue={editing?.status ?? "NEW"}
                    name="status"
                    required
                  >
                    {enquiryStatuses.map((status) => (
                      <option key={status} value={status}>
                        {humanize(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Assigned Agent (optional)
                  <select
                    defaultValue={editing?.assignedAgentId ?? ""}
                    name="assignedAgentId"
                  >
                    <option value="">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} · {agent.email}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {editingEventRequest && editing ? (
                <>
                  <input
                    name="description"
                    type="hidden"
                    value={editing.description}
                  />
                  <div className="admin-enquiry-conversion-summary">
                    <strong>Customer event request details</strong>
                    <p>{formatCustomerEventRequest(editingEventRequest)}</p>
                    <small>
                      Request details are kept as submitted. Use Event Management
                      to manage the linked event schedule.
                    </small>
                  </div>
                </>
              ) : (
                <label>
                  Enquiry description
                  <textarea
                    defaultValue={editing?.description ?? ""}
                    maxLength={10000}
                    name="description"
                    required
                    rows={5}
                  />
                </label>
              )}
              <label>
                Internal notes
                <textarea
                  defaultValue={editing?.internalNotes ?? ""}
                  maxLength={4000}
                  name="internalNotes"
                  rows={3}
                />
              </label>
              <label>
                Status change remarks
                <input
                  maxLength={1000}
                  name="statusRemarks"
                  placeholder="Optional context for a status change"
                />
              </label>
              {error && (
                <p className="admin-directory-error" role="alert">
                  {error}
                </p>
              )}
              <div className="admin-modal-actions">
                <button
                  className="admin-modal-cancel"
                  disabled={busy}
                  onClick={() => {
                    setEditing(undefined);
                    setError("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button className="button button-dark" disabled={busy}>
                  {busy ? "Saving…" : editing ? "Save changes" : "Add enquiry"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {viewing && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setViewing(null);
              setError("");
            }
          }}
        >
          <section
            aria-labelledby="admin-enquiry-view-title"
            aria-modal="true"
            className="admin-modal admin-enquiry-modal"
            role="dialog"
          >
            <div className="admin-modal-heading">
              <div>
                <p className="eyebrow">Enquiry details</p>
                <h2 id="admin-enquiry-view-title">{viewing.enquiryNumber}</h2>
              </div>
              <button
                aria-label="Close enquiry details"
                className="admin-modal-close"
                onClick={() => setViewing(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="admin-enquiry-detail-sections">
              <section>
                <h3>Customer information</h3>
                <dl className="admin-booking-details">
                  <Detail label="Customer" value={viewing.customerName} />
                  <Detail label="Email" value={viewing.customerEmail || "Not provided"} />
                  <Detail label="Phone" value={viewing.customerPhone || "Not provided"} />
                  <Detail label="Linked customer" value={viewing.customer ? `${viewing.customer.name} · ${viewing.customer.id}` : "No registered account linked"} />
                </dl>
              </section>
              <section>
                <h3>Enquiry information</h3>
                <dl className="admin-booking-details">
                  <Detail label="Subject" value={viewing.subject} />
                  <Detail label="Type" value={viewing.enquiryType} />
                  <Detail
                    label="Description"
                    value={
                      viewingEventRequest
                        ? formatCustomerEventRequest(viewingEventRequest)
                        : viewing.description
                    }
                  />
                  <Detail label="Source" value={viewing.source} />
                  <Detail label="Priority" value={humanize(viewing.priority)} />
                  <Detail label="Status" value={humanize(viewing.status)} />
                  <Detail label="Created date" value={displayDateTime(viewing.createdAt)} />
                </dl>
              </section>
              <section className="admin-enquiry-conversation">
                <h3>Customer conversation</h3>
                {viewing.activities.some(
                  (activity) =>
                    activity.activityType === "CUSTOMER_MESSAGE" ||
                  activity.activityType === "ADMIN_RESPONSE" ||
                  activity.activityType === "CUSTOMER_CANCELLATION_REQUEST",
                ) ? (
                  <ol>
                    {viewing.activities
                      .filter(
                        (activity) =>
                          activity.activityType === "CUSTOMER_MESSAGE" ||
                          activity.activityType === "ADMIN_RESPONSE" ||
                          activity.activityType === "CUSTOMER_CANCELLATION_REQUEST",
                      )
                      .map((activity) => (
                        <li key={activity.id}>
                          <strong>
                            {activity.activityType === "CUSTOMER_MESSAGE" ||
                            activity.activityType === "CUSTOMER_CANCELLATION_REQUEST"
                              ? viewing.customerName
                              : "Camelot team"}
                          </strong>
                          <p>{activity.description}</p>
                          <time dateTime={activity.createdAt}>
                            {displayDateTime(activity.createdAt)}
                          </time>
                        </li>
                      ))}
                  </ol>
                ) : (
                  <p>No customer messages yet.</p>
                )}
                {viewing.customerId ? (
                  <form onSubmit={respondToCustomer}>
                    <label>
                      Reply to customer
                      <textarea
                        maxLength={10000}
                        name="message"
                        required
                      />
                    </label>
                    <button
                      className="admin-directory-action"
                      disabled={busy}
                      type="submit"
                    >
                      {busy ? "Sending…" : "Send response"}
                    </button>
                  </form>
                ) : (
                  <p>
                    A customer account is not linked, so a portal response
                    cannot be sent.
                  </p>
                )}
              </section>
              <section>
                <h3>Assignment information</h3>
                <dl className="admin-booking-details">
                  <Detail label="Assigned Agent" value={viewing.assignedAgent?.name ?? "Unassigned"} />
                  <Detail label="Assigned by" value={viewing.assignedBy?.name ?? "Not assigned"} />
                  <Detail label="Assigned date" value={viewing.assignedAt ? displayDateTime(viewing.assignedAt) : "Not assigned"} />
                  <Detail label="Internal notes" value={viewing.internalNotes || "None"} />
                </dl>
              </section>
              {viewing.convertedBooking && (
                <section className="admin-enquiry-conversion-banner">
                  Converted to booking <strong>{viewing.convertedBooking.bookingNumber}</strong>.
                </section>
              )}
              {viewing.events.map((event) => (
                <section className="admin-enquiry-conversion-banner" key={event.id}>
                  Linked event <strong>{event.eventNumber}</strong> · {humanize(event.status)}
                </section>
              ))}
              <section>
                <h3>Follow-up management</h3>
                <form
                  className="admin-enquiry-followup-form"
                  onSubmit={(event) => createFollowup(event)}
                >
                  <label>
                    Follow-up date
                    <input name="date" required type="date" />
                  </label>
                  <label>
                    Follow-up time
                    <input name="time" type="time" />
                  </label>
                  <label className="admin-enquiry-followup-notes">
                    Follow-up notes
                    <input maxLength={2000} name="notes" />
                  </label>
                  <button className="admin-directory-action" disabled={busy}>
                    Schedule follow-up
                  </button>
                </form>
                {viewing.followups.length ? (
                  <ul className="admin-enquiry-followup-list">
                    {viewing.followups.map((followup) => {
                      const overdue =
                        followup.status === "SCHEDULED" &&
                        isOverdue(followup.scheduledDate);
                      return (
                        <li key={followup.id}>
                          <div>
                            <strong className={overdue ? "is-overdue-text" : ""}>
                              {displayDate(followup.scheduledDate, "long")}
                              {followup.scheduledTime
                                ? ` · ${followup.scheduledTime}`
                                : ""}
                              {overdue ? " · Overdue" : ""}
                            </strong>
                            <span className={`enquiry-followup-status is-${followup.status.toLowerCase()}`}>
                              {humanize(followup.status)}
                            </span>
                            {followup.notes && <p>{followup.notes}</p>}
                            {followup.completedAt && (
                              <small>Completed {displayDateTime(followup.completedAt)}</small>
                            )}
                          </div>
                          {followup.status === "SCHEDULED" && (
                            <div className="admin-enquiry-followup-actions">
                              <button
                                className="admin-directory-action"
                                disabled={busy}
                                onClick={() => void markFollowupComplete(followup)}
                                type="button"
                              >
                                Mark complete
                              </button>
                              <form onSubmit={(event) => createFollowup(event, followup.id)}>
                                <label>
                                  Reschedule date
                                  <input name="date" required type="date" />
                                </label>
                                <label>
                                  Time
                                  <input name="time" type="time" />
                                </label>
                                <label>
                                  Notes
                                  <input maxLength={2000} name="notes" />
                                </label>
                                <button
                                  className="admin-directory-action"
                                  disabled={busy}
                                  type="submit"
                                >
                                  Reschedule
                                </button>
                              </form>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="admin-enquiry-no-followups">No follow-ups scheduled yet.</p>
                )}
              </section>
              <section>
                <h3>Status history</h3>
                <ol className="admin-booking-history">
                  {viewing.statusHistory.map((entry) => (
                    <li key={entry.id}>
                      <strong>
                        {entry.previousStatus
                          ? `${humanize(entry.previousStatus)} → `
                          : "Created as "}
                        {humanize(entry.newStatus)}
                      </strong>
                      <span>
                        {entry.changedBy?.name ?? "Admin"} · {displayDateTime(entry.createdAt)}
                        {entry.remarks ? ` · ${entry.remarks}` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
              <section>
                <h3>Activity history</h3>
                <ol className="admin-enquiry-activity">
                  {viewing.activities.map((activity) => (
                    <li key={activity.id}>
                      <span className={`admin-enquiry-activity-dot is-${activity.activityType.toLowerCase().replaceAll("_", "-")}`} />
                      <div>
                        <strong>{humanize(activity.activityType)}</strong>
                        <p>{activity.description}</p>
                        <small>
                          {activity.createdBy?.name ?? "Admin"} · {displayDateTime(activity.createdAt)}
                        </small>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
            {error && (
              <p className="admin-directory-error" role="alert">
                {error}
              </p>
            )}
            <div className="admin-modal-actions">
              {viewingEventRequest &&
                viewing.status !== "CLOSED" &&
                viewing.status !== "LOST" &&
                viewing.status !== "CONVERTED" &&
                !viewing.convertedBooking &&
                viewing.events.length === 0 && (
                  <button
                    className="admin-modal-cancel"
                    onClick={() => {
                      setError("");
                      setConvertingEvent(viewing);
                      setViewing(null);
                    }}
                    type="button"
                  >
                    Create draft event
                  </button>
                )}
              {!viewingEventRequest &&
                viewing.status !== "CLOSED" &&
                viewing.status !== "LOST" &&
                viewing.status !== "CONVERTED" &&
                !viewing.convertedBooking && (
                  <button
                    className="admin-modal-cancel"
                    onClick={() => {
                      setError("");
                      setConverting(viewing);
                    }}
                    type="button"
                  >
                    Convert to booking
                  </button>
                )}
              <button
                className="admin-modal-cancel"
                disabled={busy}
                onClick={() => void removeEnquiry(viewing)}
                type="button"
              >
                Delete
              </button>
              <button
                className="admin-modal-cancel"
                onClick={() => {
                  setViewing(null);
                  setError("");
                }}
                type="button"
              >
                Close
              </button>
              <button
                className="button button-dark"
                onClick={() => {
                  setEditing(viewing);
                  setViewing(null);
                }}
                type="button"
              >
                Edit enquiry
              </button>
            </div>
          </section>
        </div>
      )}

      {converting && (
        <div className="admin-modal-backdrop">
          <section
            aria-labelledby="admin-enquiry-convert-title"
            aria-modal="true"
            className="admin-modal admin-enquiry-modal"
            role="dialog"
          >
            <div className="admin-modal-heading">
              <div>
                <p className="eyebrow">Convert enquiry</p>
                <h2 id="admin-enquiry-convert-title">
                  Create booking from {converting.enquiryNumber}
                </h2>
              </div>
              <button
                aria-label="Close conversion form"
                className="admin-modal-close"
                disabled={busy}
                onClick={() => {
                  setConverting(null);
                  setError("");
                }}
                type="button"
              >
                ×
              </button>
            </div>
            <p className="admin-enquiry-conversion-summary">
              {converting.subject} · {converting.customerName}
            </p>
            <form
              className="admin-user-edit-form admin-enquiry-form"
              onSubmit={convertToBooking}
            >
              <label>
                Existing customer account
                <select
                  defaultValue={converting.customerId ?? ""}
                  name="customerId"
                  required
                >
                  <option disabled value="">
                    Select a registered customer
                  </option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} · {customer.email}
                    </option>
                  ))}
                </select>
                <small>
                  Enquiries from unregistered contacts must be linked to an
                  existing customer before conversion. No duplicate account will
                  be created.
                </small>
              </label>
              <div className="admin-enquiry-form-grid">
                <label>
                  Booking date
                  <input name="bookingDate" required type="date" />
                </label>
                <label>
                  Booking time
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
                  Assign Agent (optional)
                  <select defaultValue={converting.assignedAgentId ?? ""} name="assignedAgentId">
                    <option value="">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Occasion (optional)
                  <input defaultValue={converting.enquiryType} maxLength={100} name="occasion" />
                </label>
              </div>
              <p className="admin-enquiry-conversion-summary">
                Booking type: {/private|event|group/i.test(converting.enquiryType)
                  ? "Private dining"
                  : "Dining"}
                . The enquiry subject and description will be included in booking
                special requests.
              </p>
              {error && (
                <p className="admin-directory-error" role="alert">
                  {error}
                </p>
              )}
              <div className="admin-modal-actions">
                <button
                  className="admin-modal-cancel"
                  disabled={busy}
                  onClick={() => {
                    setConverting(null);
                    setError("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button className="button button-dark" disabled={busy}>
                  {busy ? "Converting…" : "Create booking"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {convertingEvent && convertingEventDetails && (
        <div className="admin-modal-backdrop">
          <section
            aria-labelledby="admin-event-request-convert-title"
            aria-modal="true"
            className="admin-modal admin-enquiry-modal"
            role="dialog"
          >
            <div className="admin-modal-heading">
              <div>
                <p className="eyebrow">Convert event request</p>
                <h2 id="admin-event-request-convert-title">
                  Create a draft event
                </h2>
              </div>
              <button
                aria-label="Close event conversion form"
                className="admin-modal-close"
                disabled={busy}
                onClick={() => {
                  setConvertingEvent(null);
                  setError("");
                }}
                type="button"
              >
                ×
              </button>
            </div>
            <p className="admin-enquiry-conversion-summary">
              {convertingEvent.enquiryNumber} · {convertingEvent.subject} ·{" "}
              {convertingEvent.customerName}
            </p>
            <form
              className="admin-user-edit-form admin-enquiry-form"
              onSubmit={convertToEvent}
            >
              <div className="admin-enquiry-form-grid">
                <label>
                  Event category
                  <select
                    defaultValue={
                      eventCategories.some(
                        (category) => category.id === convertingEventDetails.categoryId,
                      )
                        ? convertingEventDetails.categoryId
                        : ""
                    }
                    name="categoryId"
                    required
                  >
                    <option disabled value="">
                      Select an active category
                    </option>
                    {eventCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Event date
                  <input
                    defaultValue={
                      convertingEvent.preferredEventDate?.slice(0, 10) ??
                      convertingEventDetails.preferredDate
                    }
                    name="eventDate"
                    required
                    type="date"
                  />
                </label>
                <label>
                  Setup starts
                  <input
                    defaultValue={convertingEventDetails.preferredStartTime}
                    name="setupStartTime"
                    required
                    type="time"
                  />
                </label>
                <label>
                  Event starts
                  <input
                    defaultValue={convertingEventDetails.preferredStartTime}
                    name="startTime"
                    required
                    type="time"
                  />
                </label>
                <label>
                  Event ends
                  <input
                    defaultValue={convertingEventDetails.preferredEndTime}
                    name="endTime"
                    required
                    type="time"
                  />
                </label>
                <label>
                  Cleanup ends
                  <input
                    defaultValue={convertingEventDetails.preferredEndTime}
                    name="cleanupEndTime"
                    required
                    type="time"
                  />
                </label>
                <label>
                  Venue / area
                  <input maxLength={120} name="venue" required />
                </label>
                <label>
                  Venue capacity (optional)
                  <input min={1} name="venueCapacity" type="number" />
                </label>
                <label>
                  Customer contact number
                  <input
                    defaultValue={convertingEvent.customerPhone ?? ""}
                    maxLength={40}
                    name="contactNumber"
                    required
                  />
                </label>
              </div>
              <p className="admin-enquiry-conversion-summary">
                This creates a draft Event linked to the original enquiry.
                Scheduling details are not confirmation; Admin must approve and
                confirm it separately.
              </p>
              {error && (
                <p className="admin-directory-error" role="alert">
                  {error}
                </p>
              )}
              <div className="admin-modal-actions">
                <button
                  className="admin-modal-cancel"
                  disabled={busy}
                  onClick={() => {
                    setConvertingEvent(null);
                    setError("");
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="button button-dark"
                  disabled={busy || eventCategories.length === 0}
                >
                  {busy ? "Creating…" : "Create draft event"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
