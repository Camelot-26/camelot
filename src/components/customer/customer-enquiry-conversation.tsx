"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendCustomerEnquiryMessage } from "@/app/(customer)/customer/enquiries/actions";
import type { EnquiryStatusValue } from "@/lib/enquiry-constants";

type CustomerEnquiryMessage = {
  id: string;
  isCustomer: boolean;
  description: string;
  createdAt: string;
};

function canReply(status: EnquiryStatusValue) {
  return status !== "CONVERTED" && status !== "CLOSED" && status !== "LOST";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CustomerEnquiryConversation({
  enquiryId,
  status,
  messages,
}: {
  enquiryId: string;
  status: EnquiryStatusValue;
  messages: CustomerEnquiryMessage[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const result = await sendCustomerEnquiryMessage(
        enquiryId,
        String(formData.get("message") ?? ""),
      );
      if (!result.success) {
        setError(result.message);
        return;
      }
      form.reset();
      router.refresh();
    } catch (actionError) {
      console.error("Could not send a customer enquiry message.", actionError);
      setError("Your message could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="customer-enquiry-conversation">
      <h2>Conversation</h2>
      {messages.length ? (
        <ol>
          {messages.map((message) => (
            <li
              className={message.isCustomer ? "is-customer-message" : "is-team-response"}
              key={message.id}
            >
              <div>
                <strong>
                  {message.isCustomer ? "You" : "Camelot team"}
                </strong>
                <time dateTime={message.createdAt}>
                  {formatDateTime(message.createdAt)}
                </time>
              </div>
              <p>{message.description}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="customer-enquiry-no-messages">
          No replies yet. Your original enquiry description is shown above.
        </p>
      )}
      {canReply(status) ? (
        <form onSubmit={submit}>
          <label>
            Add information or reply
            <textarea maxLength={10000} name="message" required />
          </label>
          {error && (
            <p className="admin-directory-error" role="alert">
              {error}
            </p>
          )}
          <button className="button button-dark" disabled={busy} type="submit">
            {busy ? "Sending…" : "Send message"}
          </button>
        </form>
      ) : (
        <p className="customer-enquiry-no-messages">
          This enquiry is closed and can no longer receive messages.
        </p>
      )}
    </section>
  );
}
