"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  deleteEvent,
  deleteEventChecklistItem,
  saveEvent,
  saveEventCategory,
  saveEventChecklistItem,
} from "@/app/(admin)/admin/events/actions";
import {
  eventStatuses,
  eventTaskPriorities,
  eventTaskStatuses,
  type EventInput,
  type EventStatusValue,
  type EventTaskPriorityValue,
  type EventTaskStatusValue,
} from "@/lib/event-constants";

type StaffOption = { id: string; name: string; email: string; role: string };
type CustomerOption = { id: string; name: string; email: string; phone: string | null };
type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  eventCount: number;
};
type LinkOption = { id: string; enquiryNumber: string; subject: string; customerName: string };
type BookingOption = { id: string; bookingNumber: string; customer: { name: string } };
type EventChecklist = {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  assignedToId: string | null;
  dueDate: string | null;
  priority: EventTaskPriorityValue;
  status: EventTaskStatusValue;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: { id: string; name: string } | null;
  completedBy: { name: string } | null;
};
type EventRow = {
  id: string;
  eventNumber: string;
  name: string;
  categoryId: string;
  description: string;
  eventDate: string;
  setupStartTime: string;
  startTime: string;
  endTime: string;
  cleanupEndTime: string;
  status: EventStatusValue;
  coverImage: string | null;
  customerId: string | null;
  customerName: string;
  contactNumber: string;
  emailAddress: string | null;
  companyName: string | null;
  expectedGuests: number;
  adults: number;
  children: number;
  occasion: string | null;
  seatingArrangement: string | null;
  venue: string;
  venueCapacity: number | null;
  venueRequirements: string | null;
  foodBeverageRequirements: string | null;
  decorationRequirements: string | null;
  entertainmentRequirements: string | null;
  additionalNotes: string | null;
  assignedCoordinatorId: string | null;
  assignedAgentId: string | null;
  assignedById: string | null;
  assignedAt: string | null;
  internalNotes: string | null;
  enquiryId: string | null;
  bookingId: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; isActive: boolean };
  customer: CustomerOption | null;
  coordinator: { id: string; name: string; email: string } | null;
  assignedAgent: { id: string; name: string; email: string } | null;
  createdBy: { name: string };
  enquiry: { id: string; enquiryNumber: string; subject: string } | null;
  booking: { id: string; bookingNumber: string } | null;
  statusHistory: {
    id: string;
    previousStatus: EventStatusValue | null;
    newStatus: EventStatusValue;
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
  assignmentHistory: {
    id: string;
    createdAt: string;
    previousCoordinator: { name: string } | null;
    newCoordinator: { name: string } | null;
    previousAgent: { name: string } | null;
    newAgent: { name: string } | null;
    changedBy: { name: string } | null;
  }[];
  checklist: EventChecklist[];
};
type CalendarEvent = {
  id: string;
  eventNumber: string;
  name: string;
  eventDate: string;
  setupStartTime: string;
  startTime: string;
  endTime: string;
  cleanupEndTime: string;
  venue: string;
  status: EventStatusValue;
  category: { name: string };
};
type EventFilters = {
  q: string;
  category: string;
  status: string;
  date: string;
  coordinator: string;
  venue: string;
  sort: "eventDate" | "createdAt";
  direction: "asc" | "desc";
  page: number;
  pageSize: number;
  mode: "list" | "calendar";
  calendarView: "month" | "week" | "day";
  month: string;
  day: string;
};

function titleCase(value: string) {
  return value.toLowerCase().split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function dateLabel(value: string, options: Intl.DateTimeFormatOptions = {}) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", ...options,
  });
}

function dateTimeLabel(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function getEventInput(form: FormData, event: EventRow | null): EventInput {
  return {
    ...(event ? { id: event.id } : {}),
    name: String(form.get("name") ?? ""),
    categoryId: String(form.get("categoryId") ?? ""),
    description: String(form.get("description") ?? ""),
    eventDate: String(form.get("eventDate") ?? ""),
    setupStartTime: String(form.get("setupStartTime") ?? ""),
    startTime: String(form.get("startTime") ?? ""),
    endTime: String(form.get("endTime") ?? ""),
    cleanupEndTime: String(form.get("cleanupEndTime") ?? ""),
    status: String(form.get("status") ?? "DRAFT") as EventStatusValue,
    coverImage: String(form.get("coverImage") ?? ""),
    customerId: String(form.get("customerId") ?? ""),
    customerName: String(form.get("customerName") ?? ""),
    contactNumber: String(form.get("contactNumber") ?? ""),
    emailAddress: String(form.get("emailAddress") ?? ""),
    companyName: String(form.get("companyName") ?? ""),
    expectedGuests: Number(form.get("expectedGuests")),
    adults: Number(form.get("adults")),
    children: Number(form.get("children")),
    occasion: String(form.get("occasion") ?? ""),
    seatingArrangement: String(form.get("seatingArrangement") ?? ""),
    venue: String(form.get("venue") ?? ""),
    venueCapacity: String(form.get("venueCapacity") ?? "")
      ? Number(form.get("venueCapacity"))
      : null,
    venueRequirements: String(form.get("venueRequirements") ?? ""),
    foodBeverageRequirements: String(form.get("foodBeverageRequirements") ?? ""),
    decorationRequirements: String(form.get("decorationRequirements") ?? ""),
    entertainmentRequirements: String(form.get("entertainmentRequirements") ?? ""),
    additionalNotes: String(form.get("additionalNotes") ?? ""),
    assignedCoordinatorId: String(form.get("assignedCoordinatorId") ?? ""),
    assignedAgentId: String(form.get("assignedAgentId") ?? ""),
    internalNotes: String(form.get("internalNotes") ?? ""),
    enquiryId: String(form.get("enquiryId") ?? ""),
    bookingId: String(form.get("bookingId") ?? ""),
    statusRemarks: String(form.get("statusRemarks") ?? ""),
  };
}

function transitionOptions(status: EventStatusValue) {
  const transitions: Record<EventStatusValue, EventStatusValue[]> = {
    DRAFT: ["PENDING_APPROVAL", "CONFIRMED", "CANCELLED"],
    PENDING_APPROVAL: ["DRAFT", "CONFIRMED", "CANCELLED"],
    CONFIRMED: ["IN_PREPARATION", "CANCELLED"],
    IN_PREPARATION: ["READY", "CANCELLED"],
    READY: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  };
  return [status, ...transitions[status]];
}

function eventFormStatusOptions(event: EventRow | null) {
  return event ? transitionOptions(event.status) : ["DRAFT", "PENDING_APPROVAL", "CONFIRMED"] as EventStatusValue[];
}

function isConflict(a: CalendarEvent, b: CalendarEvent) {
  const active = ["CONFIRMED", "IN_PREPARATION", "READY", "IN_PROGRESS"];
  return a.id !== b.id &&
    a.eventDate === b.eventDate &&
    a.venue.toLowerCase() === b.venue.toLowerCase() &&
    active.includes(a.status) &&
    active.includes(b.status) &&
    a.setupStartTime < b.cleanupEndTime &&
    b.setupStartTime < a.cleanupEndTime;
}

export function AdminEventManagement({
  agents,
  staff,
  customers,
  categories,
  enquiries,
  bookings,
  events,
  calendarEvents,
  filters,
  pageCount,
  total,
}: {
  agents: StaffOption[];
  staff: StaffOption[];
  customers: CustomerOption[];
  categories: CategoryOption[];
  enquiries: LinkOption[];
  bookings: BookingOption[];
  events: EventRow[];
  calendarEvents: CalendarEvent[];
  filters: EventFilters;
  pageCount: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [editing, setEditing] = useState<EventRow | null | undefined>(undefined);
  const [viewing, setViewing] = useState<EventRow | CalendarEvent | null>(null);
  const [categoryManager, setCategoryManager] = useState(false);
  const [categoryEdit, setCategoryEdit] = useState<CategoryOption | null>(null);
  const [taskEdit, setTaskEdit] = useState<EventChecklist | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function navigateParams(updates: Record<string, string | number>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(updates)) {
      if (value === "") params.delete(key);
      else params.set(key, String(value));
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function submitFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    navigateParams({
      q: String(form.get("q") ?? "").trim(),
      category: String(form.get("category") ?? ""),
      status: String(form.get("status") ?? ""),
      date: String(form.get("date") ?? ""),
      coordinator: String(form.get("coordinator") ?? ""),
      venue: String(form.get("venue") ?? "").trim(),
      page: 1,
    });
  }

  async function submitEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await saveEvent(getEventInput(new FormData(event.currentTarget), editing ?? null));
      if (!result.success) {
        setError(result.message);
        return;
      }
      setEditing(undefined);
      setNotice(editing ? "Event updated." : `Event ${result.eventNumber} created.`);
      router.refresh();
    } catch (actionError) {
      console.error("Could not save an admin event.", actionError);
      setError("The event could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeEvent(event: EventRow) {
    if (!window.confirm(`Delete event ${event.eventNumber}? It will be removed from the active directory.`)) return;
    setBusy(true);
    setError("");
    try {
      const result = await deleteEvent(event.id);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setViewing(null);
      setNotice(`Event ${event.eventNumber} deleted.`);
      router.refresh();
    } catch (actionError) {
      console.error("Could not delete an admin event.", actionError);
      setError("The event could not be deleted. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await saveEventCategory({
        ...(categoryEdit ? { id: categoryEdit.id } : {}),
        name: String(form.get("name") ?? ""),
        isActive: categoryEdit?.isActive ?? true,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setCategoryEdit(null);
      setNotice(categoryEdit ? "Category updated." : "Category added.");
      router.refresh();
    } catch (actionError) {
      console.error("Could not save an event category.", actionError);
      setError("The event category could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCategory(category: CategoryOption) {
    setBusy(true);
    setError("");
    try {
      const result = await saveEventCategory({
        id: category.id,
        name: category.name,
        isActive: !category.isActive,
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.refresh();
    } catch (actionError) {
      console.error("Could not update event category status.", actionError);
      setError("The event category could not be updated. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitChecklist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isFullEvent(viewing)) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await saveEventChecklistItem({
        ...(taskEdit ? { id: taskEdit.id } : {}),
        eventId: viewing.id,
        name: String(form.get("taskName") ?? ""),
        description: String(form.get("taskDescription") ?? ""),
        assignedToId: String(form.get("taskAssignee") ?? ""),
        dueDate: String(form.get("taskDueDate") ?? ""),
        priority: String(form.get("taskPriority") ?? "MEDIUM"),
        status: String(form.get("taskStatus") ?? "PENDING"),
      });
      if (!result.success) {
        setError(result.message);
        return;
      }
      setTaskEdit(null);
      setNotice(taskEdit ? "Checklist item updated." : "Checklist item added.");
      router.refresh();
    } catch (actionError) {
      console.error("Could not save an event checklist item.", actionError);
      setError("The checklist item could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeTask(item: EventChecklist) {
    if (!window.confirm(`Delete checklist item "${item.name}"?`)) return;
    setBusy(true);
    setError("");
    try {
      const result = await deleteEventChecklistItem(item.id);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.refresh();
    } catch (actionError) {
      console.error("Could not delete an event checklist item.", actionError);
      setError("The checklist item could not be deleted. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function toggleSort(sort: EventFilters["sort"]) {
    navigateParams({
      sort,
      direction: filters.sort === sort && filters.direction === "desc" ? "asc" : "desc",
      page: 1,
    });
  }

  function setCalendarAnchor(offset: number) {
    const date = filters.calendarView === "month"
      ? new Date(`${filters.month}-01T00:00:00Z`)
      : new Date(`${filters.day}T00:00:00Z`);
    if (filters.calendarView === "month") date.setUTCMonth(date.getUTCMonth() + offset);
    else date.setUTCDate(date.getUTCDate() + offset * (filters.calendarView === "week" ? 7 : 1));
    navigateParams({
      month: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      day: date.toISOString().slice(0, 10),
    });
  }

  const totalTasks = isFullEvent(viewing) ? viewing.checklist.length : 0;
  const completedTasks = isFullEvent(viewing)
    ? viewing.checklist.filter((item) => item.status === "COMPLETED").length
    : 0;

  return (
    <section className="admin-events-page">
      <header className="admin-events-header">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Event management</h1>
          <p>Plan, schedule and coordinate events hosted at Camelot.</p>
        </div>
        <div className="admin-events-header-actions">
          <button className="button button-outline" onClick={() => {
            setError("");
            setCategoryManager(true);
          }} type="button">Manage categories</button>
          <button className="button button-dark" onClick={() => {
            setError("");
            setEditing(null);
          }} type="button">Create event</button>
        </div>
      </header>

      {notice && <p aria-live="polite" className="admin-event-notice">{notice}<button onClick={() => setNotice("")} type="button" aria-label="Dismiss">×</button></p>}
      {error && editing === undefined && !categoryManager && <p className="admin-directory-error" role="alert">{error}</p>}

      <div className="admin-event-toolbar">
        <div className="admin-event-view-switch" aria-label="Event view">
          <button className={filters.mode === "list" ? "is-active" : ""} onClick={() => navigateParams({ view: "list" })} type="button">List</button>
          <button className={filters.mode === "calendar" ? "is-active" : ""} onClick={() => navigateParams({ view: "calendar", month: filters.month })} type="button">Calendar</button>
        </div>
        {filters.mode === "calendar" && (
          <div className="admin-event-calendar-controls">
            <button type="button" onClick={() => setCalendarAnchor(-1)} aria-label="Previous period">‹</button>
            <strong>
              {filters.calendarView === "month"
                ? new Date(`${filters.month}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
                : dateLabel(filters.day, { weekday: "long", month: "long", year: "numeric" })}
            </strong>
            <button type="button" onClick={() => setCalendarAnchor(1)} aria-label="Next period">›</button>
            <select aria-label="Calendar period" value={filters.calendarView} onChange={(event) => navigateParams({ calendarView: event.target.value })}>
              <option value="month">Month</option><option value="week">Week</option><option value="day">Day</option>
            </select>
          </div>
        )}
      </div>

      <div className="admin-bookings-panel admin-events-panel">
        <form className="admin-bookings-filters admin-event-filters" onSubmit={submitFilters}>
          <label className="admin-directory-search">
            <span className="sr-only">Search events</span>
            <input defaultValue={filters.q} name="q" placeholder="Search event ID, event name or organizer" />
          </label>
          <label><span className="sr-only">Category</span><select defaultValue={filters.category} name="category"><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label><span className="sr-only">Status</span><select defaultValue={filters.status} name="status"><option value="">All statuses</option>{eventStatuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></label>
          <label><span className="sr-only">Event date</span><input defaultValue={filters.date} name="date" type="date" aria-label="Event date" /></label>
          <label><span className="sr-only">Coordinator</span><select defaultValue={filters.coordinator} name="coordinator"><option value="">All coordinators</option>{staff.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
          <label><span className="sr-only">Venue</span><input defaultValue={filters.venue} name="venue" placeholder="Venue / area" /></label>
          <button className="admin-booking-filter-submit" type="submit">Apply filters</button>
        </form>

        {filters.mode === "calendar" ? (
          <CalendarView
            events={calendarEvents}
            view={filters.calendarView}
            month={filters.month}
            day={filters.day}
            onSelect={(event) => setViewing(event)}
          />
        ) : (
          <>
            <div className="admin-bookings-table-wrap">
              <table className="admin-bookings-table admin-events-table">
                <thead><tr>
                  <th>Event</th><th>Category</th><th>Customer / organizer</th>
                  <th><button className="admin-booking-sort" onClick={() => toggleSort("eventDate")} type="button">Date / time {filters.sort === "eventDate" ? (filters.direction === "asc" ? "↑" : "↓") : ""}</button></th>
                  <th>Guests</th><th>Venue</th><th>Coordinator</th><th>Status</th>
                  <th><button className="admin-booking-sort" onClick={() => toggleSort("createdAt")} type="button">Created {filters.sort === "createdAt" ? (filters.direction === "asc" ? "↑" : "↓") : ""}</button></th><th>Actions</th>
                </tr></thead>
                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td><button className="admin-event-name" onClick={() => setViewing(event)} type="button"><strong>{event.name}</strong><span>{event.eventNumber}</span></button></td>
                      <td>{event.category.name}</td>
                      <td>{event.customerName}<span className="admin-enquiry-cell-subtitle">{event.contactNumber}</span></td>
                      <td>{dateLabel(event.eventDate)}<span className="admin-enquiry-cell-subtitle">{event.startTime}–{event.endTime}</span></td>
                      <td>{event.expectedGuests}</td><td>{event.venue}</td>
                      <td>{event.coordinator?.name ?? "Unassigned"}</td>
                      <td><span className={`admin-event-status status-${event.status.toLowerCase()}`}>{titleCase(event.status)}</span></td>
                      <td>{dateLabel(event.createdAt.slice(0, 10))}</td>
                      <td><div className="admin-event-row-actions"><button onClick={() => setViewing(event)} type="button">View</button><button onClick={() => setEditing(event)} type="button">Edit</button><button onClick={() => removeEvent(event)} type="button" disabled={busy}>Delete</button></div></td>
                    </tr>
                  ))}
                  {!events.length && <tr><td className="admin-event-empty" colSpan={10}>No events found. Create an event or adjust the filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="admin-directory-pagination admin-event-pagination">
              <span>{total ? `Showing ${(filters.page - 1) * filters.pageSize + 1}–${Math.min(filters.page * filters.pageSize, total)} of ${total} events` : "No events"}</span>
              <label>Rows per page <select value={filters.pageSize} onChange={(event) => navigateParams({ pageSize: event.target.value, page: 1 })}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select></label>
              <button type="button" disabled={filters.page <= 1} onClick={() => navigateParams({ page: filters.page - 1 })}>Previous</button>
              <span>Page {filters.page} of {pageCount}</span>
              <button type="button" disabled={filters.page >= pageCount} onClick={() => navigateParams({ page: filters.page + 1 })}>Next</button>
            </div>
          </>
        )}
      </div>

      {editing !== undefined && (
        <div className="admin-event-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) setEditing(undefined);
        }}>
          <section aria-labelledby="admin-event-form-title" aria-modal="true" className="admin-event-modal" role="dialog">
            <header><div><p className="eyebrow">{editing ? editing.eventNumber : "New event"}</p><h2 id="admin-event-form-title">{editing ? "Edit event" : "Create event"}</h2></div><button onClick={() => setEditing(undefined)} type="button" aria-label="Close">×</button></header>
            <form className="admin-event-form" onSubmit={submitEvent}>
              <h3>Basic information</h3>
              <div className="admin-event-form-grid">
                <label>Event name<input name="name" required maxLength={180} defaultValue={editing?.name ?? ""} /></label>
                <label>Category<select name="categoryId" required defaultValue={editing?.categoryId ?? ""}><option value="">Select category</option>{categories.filter((category) => category.isActive || category.id === editing?.categoryId).map((category) => <option key={category.id} value={category.id}>{category.name}{category.isActive ? "" : " (Inactive)"}</option>)}</select></label>
                <label>Event date<input name="eventDate" type="date" required defaultValue={editing?.eventDate ?? ""} /></label>
                <label>Status<select name="status" defaultValue={editing?.status ?? "DRAFT"}>{eventFormStatusOptions(editing ?? null).map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></label>
                <label className="is-wide">Description<textarea name="description" rows={3} required maxLength={10000} defaultValue={editing?.description ?? ""} /></label>
                <label>Cover image URL<input name="coverImage" type="url" maxLength={500} defaultValue={editing?.coverImage ?? ""} /></label>
                <label>Status remarks<input name="statusRemarks" maxLength={1000} placeholder="Optional reason for a status change" /></label>
              </div>
              <h3>Organizer</h3>
              <div className="admin-event-form-grid">
                <label>Existing customer<select name="customerId" defaultValue={editing?.customerId ?? ""}><option value="">No linked account</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.email}</option>)}</select></label>
                <label>Customer / organizer<input name="customerName" required maxLength={120} defaultValue={editing?.customerName ?? ""} /></label>
                <label>Contact number<input name="contactNumber" required maxLength={40} defaultValue={editing?.contactNumber ?? ""} /></label>
                <label>Email address<input name="emailAddress" type="email" maxLength={254} defaultValue={editing?.emailAddress ?? ""} /></label>
                <label>Company name<input name="companyName" maxLength={160} defaultValue={editing?.companyName ?? ""} /></label>
                <label>Related enquiry<select name="enquiryId" defaultValue={editing?.enquiryId ?? ""}><option value="">No linked enquiry</option>{enquiries.map((item) => <option key={item.id} value={item.id}>{item.enquiryNumber} · {item.customerName} · {item.subject}</option>)}</select></label>
                <label>Related booking<select name="bookingId" defaultValue={editing?.bookingId ?? ""}><option value="">No linked booking</option>{bookings.map((item) => <option key={item.id} value={item.id}>{item.bookingNumber} · {item.customer.name}</option>)}</select></label>
              </div>
              <h3>Schedule and venue</h3>
              <div className="admin-event-form-grid">
                <label>Setup start<input name="setupStartTime" type="time" required defaultValue={editing?.setupStartTime ?? ""} /></label>
                <label>Event start<input name="startTime" type="time" required defaultValue={editing?.startTime ?? ""} /></label>
                <label>Event end<input name="endTime" type="time" required defaultValue={editing?.endTime ?? ""} /></label>
                <label>Cleanup end<input name="cleanupEndTime" type="time" required defaultValue={editing?.cleanupEndTime ?? ""} /></label>
                <label>Venue / area<input name="venue" required maxLength={120} defaultValue={editing?.venue ?? ""} /></label>
                <label>Venue capacity<input name="venueCapacity" type="number" min={1} defaultValue={editing?.venueCapacity ?? ""} /></label>
                <label>Seating arrangement<input name="seatingArrangement" maxLength={160} defaultValue={editing?.seatingArrangement ?? ""} /></label>
                <label>Venue requirements<input name="venueRequirements" maxLength={3000} defaultValue={editing?.venueRequirements ?? ""} /></label>
              </div>
              <h3>Guests and event requirements</h3>
              <div className="admin-event-form-grid">
                <label>Expected guests<input name="expectedGuests" type="number" min={1} required defaultValue={editing?.expectedGuests ?? 1} /></label>
                <label>Adults<input name="adults" type="number" min={0} required defaultValue={editing?.adults ?? 1} /></label>
                <label>Children<input name="children" type="number" min={0} required defaultValue={editing?.children ?? 0} /></label>
                <label>Occasion<input name="occasion" maxLength={160} defaultValue={editing?.occasion ?? ""} /></label>
                <label>Food & beverage<textarea name="foodBeverageRequirements" rows={2} maxLength={3000} defaultValue={editing?.foodBeverageRequirements ?? ""} /></label>
                <label>Decorations<textarea name="decorationRequirements" rows={2} maxLength={3000} defaultValue={editing?.decorationRequirements ?? ""} /></label>
                <label>Entertainment<textarea name="entertainmentRequirements" rows={2} maxLength={3000} defaultValue={editing?.entertainmentRequirements ?? ""} /></label>
                <label>Additional notes<textarea name="additionalNotes" rows={2} maxLength={3000} defaultValue={editing?.additionalNotes ?? ""} /></label>
              </div>
              <h3>Assignment</h3>
              <div className="admin-event-form-grid">
                <label>Coordinator<select name="assignedCoordinatorId" defaultValue={editing?.assignedCoordinatorId ?? ""}><option value="">Unassigned</option>{staff.map((user) => <option key={user.id} value={user.id}>{user.name} · {titleCase(user.role)}</option>)}</select></label>
                <label>Assigned Agent<select name="assignedAgentId" defaultValue={editing?.assignedAgentId ?? ""}><option value="">None</option>{agents.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
                <label className="is-wide">Internal notes<textarea name="internalNotes" rows={3} maxLength={5000} defaultValue={editing?.internalNotes ?? ""} /></label>
              </div>
              {error && <p className="admin-event-error" role="alert">{error}</p>}
              <footer><button className="button button-outline" disabled={busy} onClick={() => setEditing(undefined)} type="button">Cancel</button><button className="button button-dark" disabled={busy} type="submit">{busy ? "Saving…" : editing ? "Save changes" : "Create event"}</button></footer>
            </form>
          </section>
        </div>
      )}

      {categoryManager && (
        <div className="admin-event-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busy) {
            setCategoryManager(false);
            setCategoryEdit(null);
          }
        }}>
          <section aria-labelledby="admin-event-categories-title" aria-modal="true" className="admin-event-modal admin-event-category-modal" role="dialog">
            <header><div><p className="eyebrow">Event setup</p><h2 id="admin-event-categories-title">Manage categories</h2></div><button onClick={() => { setCategoryManager(false); setCategoryEdit(null); }} type="button" aria-label="Close">×</button></header>
            <form className="admin-event-category-form" onSubmit={submitCategory}><label>{categoryEdit ? "Category name" : "New category"}<input name="name" key={categoryEdit?.id ?? "new"} required maxLength={80} defaultValue={categoryEdit?.name ?? ""} /></label><button className="button button-dark" disabled={busy} type="submit">{categoryEdit ? "Save category" : "Add category"}</button>{categoryEdit && <button className="button button-outline" onClick={() => setCategoryEdit(null)} type="button">Cancel edit</button>}</form>
            {error && <p className="admin-event-error" role="alert">{error}</p>}
            <ul className="admin-event-category-list">{categories.map((category) => <li key={category.id}><div><strong>{category.name}</strong><span>{category.eventCount} events · {category.isActive ? "Active" : "Inactive"}</span></div><div><button type="button" onClick={() => setCategoryEdit(category)}>Edit</button><button type="button" disabled={busy} onClick={() => toggleCategory(category)}>{category.isActive ? "Deactivate" : "Activate"}</button></div></li>)}</ul>
          </section>
        </div>
      )}

      {viewing && (
        <div className="admin-event-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setViewing(null);
            setTaskEdit(null);
          }
        }}>
          <section aria-labelledby="admin-event-detail-title" aria-modal="true" className="admin-event-modal admin-event-detail-modal" role="dialog">
            <header><div><p className="eyebrow">{viewing.eventNumber}</p><h2 id="admin-event-detail-title">{viewing.name}</h2></div><button onClick={() => { setViewing(null); setTaskEdit(null); }} type="button" aria-label="Close">×</button></header>
            <div className="admin-event-detail">
              <div className="admin-event-detail-hero"><span className={`admin-event-status status-${viewing.status.toLowerCase()}`}>{titleCase(viewing.status)}</span><span>{isFullEvent(viewing) ? viewing.category.name : viewing.category.name}</span><span>{dateLabel(viewing.eventDate)} · {viewing.startTime}–{viewing.endTime}</span><span>{viewing.venue}</span></div>
              {isFullEvent(viewing) ? (
                <>
                  {viewing.coverImage && <div className="admin-event-cover"><Image alt="" src={viewing.coverImage} width={1200} height={440} unoptimized /></div>}
                  <div className="admin-event-detail-sections">
                    <section><h3>Overview</h3><dl><Detail label="Description" value={viewing.description} /><Detail label="Created by" value={viewing.createdBy.name} /><Detail label="Created" value={dateTimeLabel(viewing.createdAt)} /></dl></section>
                    <section><h3>Organizer</h3><dl><Detail label="Name" value={viewing.customerName} /><Detail label="Phone" value={viewing.contactNumber} /><Detail label="Email" value={viewing.emailAddress} /><Detail label="Company" value={viewing.companyName} /><Detail label="Customer account" value={viewing.customer ? `${viewing.customer.name} (${viewing.customer.email})` : "Not linked"} /></dl></section>
                    <section><h3>Schedule</h3><dl><Detail label="Setup" value={viewing.setupStartTime} /><Detail label="Event" value={`${viewing.startTime}–${viewing.endTime}`} /><Detail label="Cleanup" value={viewing.cleanupEndTime} /><Detail label="Venue capacity" value={viewing.venueCapacity?.toString()} /><Detail label="Seating" value={viewing.seatingArrangement} /><Detail label="Venue requirements" value={viewing.venueRequirements} /></dl></section>
                    <section><h3>Guests & requirements</h3><dl><Detail label="Expected guests" value={`${viewing.expectedGuests} (${viewing.adults} adults, ${viewing.children} children)`} /><Detail label="Occasion" value={viewing.occasion} /><Detail label="Food & beverage" value={viewing.foodBeverageRequirements} /><Detail label="Decorations" value={viewing.decorationRequirements} /><Detail label="Entertainment" value={viewing.entertainmentRequirements} /><Detail label="Additional notes" value={viewing.additionalNotes} /></dl></section>
                    <section><h3>Assignment & links</h3><dl><Detail label="Coordinator" value={viewing.coordinator?.name} /><Detail label="Assigned Agent" value={viewing.assignedAgent?.name} /><Detail label="Assigned date" value={viewing.assignedAt ? dateTimeLabel(viewing.assignedAt) : null} /><Detail label="Internal notes" value={viewing.internalNotes} /><Detail label="Enquiry" value={viewing.enquiry ? `${viewing.enquiry.enquiryNumber} · ${viewing.enquiry.subject}` : null} /><Detail label="Booking" value={viewing.booking?.bookingNumber} /></dl></section>
                  </div>
                  <section className="admin-event-checklist">
                    <div className="admin-event-section-title"><div><h3>Preparation checklist</h3><p>{completedTasks} of {totalTasks} tasks complete</p></div><div className="admin-event-progress"><span style={{ width: `${totalTasks ? completedTasks / totalTasks * 100 : 0}%` }} /></div></div>
                    {viewing.checklist.length > 0 ? <ul>{viewing.checklist.map((task) => <li key={task.id} className={`task-${task.status.toLowerCase()}`}><div><strong>{task.name}</strong><span>{task.description || "No description"}{task.dueDate ? ` · Due ${dateLabel(task.dueDate)}` : ""}{task.assignedTo ? ` · ${task.assignedTo.name}` : ""}{task.completedAt ? ` · Completed ${dateTimeLabel(task.completedAt)}` : ""}</span></div><span className={`admin-event-task-priority priority-${task.priority.toLowerCase()}`}>{titleCase(task.priority)}</span><span className={`admin-event-task-priority task-${task.status.toLowerCase()}`}>{titleCase(task.status)}</span><button type="button" onClick={() => setTaskEdit(task)}>Edit</button><button type="button" disabled={busy} onClick={() => removeTask(task)}>Delete</button></li>)}</ul> : <p className="admin-event-empty">No preparation tasks yet.</p>}
                    <form className="admin-event-task-form" key={taskEdit?.id ?? "new-task"} onSubmit={submitChecklist}>
                      <strong>{taskEdit ? "Edit checklist item" : "Add checklist item"}</strong>
                      <div className="admin-event-form-grid">
                        <label>Task name<input name="taskName" required maxLength={160} defaultValue={taskEdit?.name ?? ""} key={`task-name-${taskEdit?.id ?? "new"}`} /></label>
                        <label>Assigned to<select name="taskAssignee" defaultValue={taskEdit?.assignedToId ?? ""}><option value="">Unassigned</option>{staff.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
                        <label>Due date<input name="taskDueDate" type="date" defaultValue={taskEdit?.dueDate ?? ""} /></label>
                        <label>Priority<select name="taskPriority" defaultValue={taskEdit?.priority ?? "MEDIUM"}>{eventTaskPriorities.map((priority) => <option key={priority} value={priority}>{titleCase(priority)}</option>)}</select></label>
                        <label>Status<select name="taskStatus" defaultValue={taskEdit?.status ?? "PENDING"}>{eventTaskStatuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}</select></label>
                        <label className="is-wide">Description<textarea name="taskDescription" rows={2} maxLength={3000} defaultValue={taskEdit?.description ?? ""} /></label>
                      </div>
                      <div className="admin-event-task-actions"><button className="button button-dark" disabled={busy} type="submit">{taskEdit ? "Save task" : "Add task"}</button>{taskEdit && <button className="button button-outline" type="button" onClick={() => setTaskEdit(null)}>Cancel edit</button>}</div>
                    </form>
                  </section>
                  <div className="admin-event-detail-sections">
                    <section><h3>Status history</h3>{viewing.statusHistory.length ? <ol className="admin-event-history">{viewing.statusHistory.map((item) => <li key={item.id}><strong>{item.previousStatus ? titleCase(item.previousStatus) : "Created"} → {titleCase(item.newStatus)}</strong><span>{item.changedBy?.name ?? "System"} · {dateTimeLabel(item.createdAt)}</span>{item.remarks && <p>{item.remarks}</p>}</li>)}</ol> : <p>No status changes.</p>}</section>
                    <section><h3>Assignment history</h3>{viewing.assignmentHistory.length ? <ol className="admin-event-history">{viewing.assignmentHistory.map((item) => <li key={item.id}><strong>{item.previousCoordinator?.name ?? "Unassigned"} → {item.newCoordinator?.name ?? "Unassigned"}</strong><span>Agent: {item.previousAgent?.name ?? "None"} → {item.newAgent?.name ?? "None"} · {item.changedBy?.name ?? "System"} · {dateTimeLabel(item.createdAt)}</span></li>)}</ol> : <p>No assignment changes.</p>}</section>
                    <section className="is-wide"><h3>Activity timeline</h3>{viewing.activities.length ? <ol className="admin-event-history">{viewing.activities.map((item) => <li key={item.id}><strong>{titleCase(item.activityType)}</strong><span>{item.createdBy?.name ?? "System"} · {dateTimeLabel(item.createdAt)}</span><p>{item.description}</p></li>)}</ol> : <p>No activity recorded.</p>}</section>
                  </div>
                  <div className="admin-event-detail-actions"><button className="button button-outline" onClick={() => { setViewing(null); setEditing(viewing); }} type="button">Edit event</button><button className="button button-danger" disabled={busy} onClick={() => removeEvent(viewing)} type="button">Delete event</button></div>
                </>
              ) : (
                <div className="admin-event-calendar-detail"><p><strong>{viewing.category.name}</strong> · {viewing.eventNumber}</p><p>{dateLabel(viewing.eventDate)} from {viewing.startTime} to {viewing.endTime}</p><p>Venue: {viewing.venue}</p><p>Status: {titleCase(viewing.status)}</p><button className="button button-outline" onClick={() => navigateParams({ view: "list", q: viewing.eventNumber })} type="button">Open in event list</button></div>
              )}
              {error && <p className="admin-event-error" role="alert">{error}</p>}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function isFullEvent(event: EventRow | CalendarEvent | null): event is EventRow {
  return Boolean(event && "checklist" in event);
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return <div><dt>{label}</dt><dd>{value || "—"}</dd></div>;
}

function CalendarView({
  events,
  view,
  month,
  day,
  onSelect,
}: {
  events: CalendarEvent[];
  view: EventFilters["calendarView"];
  month: string;
  day: string;
  onSelect: (event: CalendarEvent) => void;
}) {
  const anchor = new Date(`${view === "month" ? `${month}-01` : day}T00:00:00Z`);
  const firstDay = view === "month"
    ? new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1))
    : new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()));
  const start = new Date(firstDay);
  if (view === "month") start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  if (view === "week") start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const dayCount = view === "day" ? 1 : view === "week" ? 7 : 42;
  const days = Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
  return (
    <div className={`admin-event-calendar calendar-${view}`}>
      {view !== "day" && <div className="admin-event-weekdays">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => <strong key={weekday}>{weekday}</strong>)}</div>}
      <div className="admin-event-calendar-grid">
        {days.map((date) => {
          const dayEvents = events.filter((event) => event.eventDate === date);
          const outsideMonth = view === "month" && date.slice(0, 7) !== month;
          return (
            <div className={`admin-event-calendar-day${outsideMonth ? " is-outside" : ""}`} key={date}>
              <strong className="admin-event-calendar-date">{view === "day" ? dateLabel(date, { weekday: "long", month: "long", day: "numeric" }) : String(Number(date.slice(-2)))}</strong>
              {dayEvents.map((event) => {
                const conflict = dayEvents.some((other) => isConflict(event, other));
                return <button className={`admin-event-calendar-item status-${event.status.toLowerCase()}${conflict ? " has-conflict" : ""}`} key={event.id} onClick={() => onSelect(event)} type="button" title={conflict ? "Scheduling conflict: venue overlaps another event" : `${event.name} · ${event.venue}`}><strong>{event.startTime} {event.name}</strong><span>{event.venue}{conflict ? " · Conflict" : ""}</span></button>;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
