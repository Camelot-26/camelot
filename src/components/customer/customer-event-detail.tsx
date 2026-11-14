"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  requestCustomerEventCancellation,
  sendCustomerEventMessage,
} from "@/app/(customer)/customer/events/actions";
import {
  customerEventStatusLabels,
  type CustomerEventStatus,
} from "@/lib/customer-event-constants";

type EventMessage = {
  id: string;
  type: string;
  description: string;
  createdAt: string;
};

type ConfirmedEvent = {
  eventNumber: string;
  name: string;
  categoryName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  status: string;
};

type EventRequestDetails = {
  companyName: string;
  seatingArrangement: string;
  foodBeverageRequirements: string;
  decorationRequirements: string;
  entertainmentRequirements: string;
  specialRequirements: string;
  additionalNotes: string;
  preferredDate: string;
  preferredStartTime: string;
  preferredEndTime: string;
};

function formatDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function visibleText(value: string) {
  return value.trim() || "Not provided";
}

function humanize(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function CustomerEventDetail({
  canReply,
  canRequestCancellation,
  categoryName,
  event,
  eventDescription,
  eventName,
  eventRequestId,
  guestCount,
  messages,
  recordId,
  request,
  status,
  submittedAt,
}: {
  canReply: boolean;
  canRequestCancellation: boolean;
  categoryName: string;
  event: ConfirmedEvent | null;
  eventDescription: string;
  eventName: string;
  eventRequestId: string;
  guestCount: { expected: number; adults: number; children: number };
  messages: EventMessage[];
  recordId: string;
  request: EventRequestDetails;
  status: CustomerEventStatus;
  submittedAt: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [cancellationOpen, setCancellationOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await sendCustomerEventMessage(recordId, message);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setMessage("");
      router.refresh();
    } catch (actionError) {
      console.error("Could not send an event request message.", actionError);
      setError("Your message could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function requestCancellation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await requestCustomerEventCancellation(
        recordId,
        cancellationReason,
      );
      if (!result.success) {
        setError(result.message);
        return;
      }
      setCancellationOpen(false);
      setCancellationReason("");
      router.refresh();
    } catch (actionError) {
      console.error("Could not request event cancellation.", actionError);
      setError("Your cancellation request could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-bookings-page customer-events-page">
      <header className="admin-bookings-header">
        <div>
          <p className="eyebrow">Event request details</p>
          <h1>{eventRequestId}</h1>
          <p>{eventName}</p>
        </div>
        <Link className="admin-modal-secondary" href="/customer/events">
          Back to my events
        </Link>
      </header>

      <div className="customer-event-detail-grid">
        <section className="customer-event-information">
          <div className="customer-event-detail-heading">
            <h2>Request information</h2>
            <span className={`customer-event-status is-${status.toLowerCase().replaceAll("_", "-")}`}>
              {customerEventStatusLabels[status]}
            </span>
          </div>
          <dl className="admin-booking-details">
            <div>
              <dt>Event Request ID</dt>
              <dd>{eventRequestId}</dd>
            </div>
            <div>
              <dt>Event name</dt>
              <dd>{eventName}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{categoryName}</dd>
            </div>
            <div>
              <dt>Preferred date</dt>
              <dd>{formatDate(request.preferredDate)}</dd>
            </div>
            <div>
              <dt>Preferred time</dt>
              <dd>{request.preferredStartTime}–{request.preferredEndTime}</dd>
            </div>
            <div>
              <dt>Expected guests</dt>
              <dd>
                {guestCount.expected} ({guestCount.adults} adults, {guestCount.children} children)
              </dd>
            </div>
            <div>
              <dt>Event description</dt>
              <dd className="customer-event-long-value">{visibleText(eventDescription)}</dd>
            </div>
            <div>
              <dt>Company</dt>
              <dd>{visibleText(request.companyName)}</dd>
            </div>
            <div>
              <dt>Preferred seating</dt>
              <dd className="customer-event-long-value">{visibleText(request.seatingArrangement)}</dd>
            </div>
            <div>
              <dt>Food and beverage requirements</dt>
              <dd className="customer-event-long-value">{visibleText(request.foodBeverageRequirements)}</dd>
            </div>
            <div>
              <dt>Decoration requirements</dt>
              <dd className="customer-event-long-value">{visibleText(request.decorationRequirements)}</dd>
            </div>
            <div>
              <dt>Entertainment requirements</dt>
              <dd className="customer-event-long-value">{visibleText(request.entertainmentRequirements)}</dd>
            </div>
            <div>
              <dt>Special requirements</dt>
              <dd className="customer-event-long-value">{visibleText(request.specialRequirements)}</dd>
            </div>
            <div>
              <dt>Additional notes</dt>
              <dd className="customer-event-long-value">{visibleText(request.additionalNotes)}</dd>
            </div>
            <div>
              <dt>Submitted date</dt>
              <dd>{formatDateTime(submittedAt)}</dd>
            </div>
          </dl>

          {event && (
            <section className="customer-event-confirmed">
              <h3>Linked event · {event.eventNumber}</h3>
              <dl className="admin-booking-details">
                <div>
                  <dt>Event status</dt>
                  <dd>{humanize(event.status)}</dd>
                </div>
                <div>
                  <dt>Confirmed date</dt>
                  <dd>{formatDate(event.eventDate)}</dd>
                </div>
                <div>
                  <dt>Event time</dt>
                  <dd>{event.startTime}–{event.endTime}</dd>
                </div>
                <div>
                  <dt>Venue / area</dt>
                  <dd>{event.venue}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{event.categoryName}</dd>
                </div>
              </dl>
            </section>
          )}
        </section>

        <section className="customer-enquiry-conversation customer-event-conversation">
          <h2>Customer-visible updates</h2>
          {messages.length ? (
            <ol>
              {messages.map((item) => {
                const isCustomer =
                  item.type === "CUSTOMER_MESSAGE" ||
                  item.type === "CUSTOMER_CANCELLATION_REQUEST";
                return (
                  <li
                    className={isCustomer ? "is-customer-message" : "is-team-response"}
                    key={item.id}
                  >
                    <div>
                      <strong>
                        {item.type === "CUSTOMER_CANCELLATION_REQUEST"
                          ? "You · Cancellation request"
                          : isCustomer
                            ? "You"
                            : "Camelot team"}
                      </strong>
                      <time dateTime={item.createdAt}>
                        {formatDateTime(item.createdAt)}
                      </time>
                    </div>
                    <p>{item.description}</p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="customer-enquiry-no-messages">
              No updates yet. Messages from the Camelot team will appear here.
            </p>
          )}
          {canReply ? (
            <form onSubmit={sendMessage}>
              <label>
                Add information or reply
                <textarea
                  maxLength={10000}
                  onChange={(event) => setMessage(event.target.value)}
                  required
                  value={message}
                />
              </label>
              <button className="button button-dark" disabled={busy} type="submit">
                {busy ? "Sending…" : "Send message"}
              </button>
            </form>
          ) : (
            <p className="customer-enquiry-no-messages">
              This event is closed and can no longer receive messages.
            </p>
          )}
          {canRequestCancellation ? (
            <button
              className="admin-modal-secondary customer-event-cancel-button"
              onClick={() => {
                setError("");
                setCancellationOpen(true);
              }}
              type="button"
            >
              Request cancellation
            </button>
          ) : messages.some(
              (item) => item.type === "CUSTOMER_CANCELLATION_REQUEST",
            ) ? (
            <p className="customer-event-cancellation-state">
              Your cancellation request has been sent for Admin review.
            </p>
          ) : null}
          {error && (
            <p className="admin-directory-error" role="alert">
              {error}
            </p>
          )}
        </section>
      </div>

      {cancellationOpen && (
        <div
          className="admin-modal-backdrop customer-cancellation-backdrop"
          onMouseDown={(mouseEvent) => {
            if (mouseEvent.target === mouseEvent.currentTarget && !busy) {
              setCancellationOpen(false);
            }
          }}
        >
          <section
            aria-labelledby="customer-event-cancellation-title"
            aria-modal="true"
            className="admin-modal customer-cancellation-modal"
            role="dialog"
          >
            <div className="admin-modal-heading">
              <div>
                <p className="eyebrow">Event {eventRequestId}</p>
                <h2 id="customer-event-cancellation-title">Request cancellation</h2>
              </div>
              <button
                aria-label="Close cancellation request"
                className="admin-modal-close"
                disabled={busy}
                onClick={() => setCancellationOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <p className="customer-cancellation-help">
              Your event will not be cancelled automatically. The Camelot team
              will review your request and respond here.
            </p>
            <form
              className="admin-user-edit-form admin-booking-form"
              onSubmit={requestCancellation}
            >
              <label>
                Cancellation reason
                <textarea
                  autoFocus
                  maxLength={2000}
                  onChange={(event) => setCancellationReason(event.target.value)}
                  required
                  value={cancellationReason}
                />
              </label>
              {error && (
                <p className="admin-directory-error" role="alert">
                  {error}
                </p>
              )}
              <div className="admin-modal-actions">
                <button
                  className="admin-modal-secondary"
                  disabled={busy}
                  onClick={() => setCancellationOpen(false)}
                  type="button"
                >
                  Keep event request
                </button>
                <button className="button button-dark" disabled={busy} type="submit">
                  {busy ? "Sending request…" : "Send request"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
