export const customerEventStatuses = [
  "REQUEST_SUBMITTED",
  "UNDER_REVIEW",
  "ADDITIONAL_INFORMATION_REQUIRED",
  "PROPOSAL_SHARED",
  "AWAITING_CUSTOMER_CONFIRMATION",
  "CONFIRMED",
  "IN_PREPARATION",
  "COMPLETED",
  "CANCELLED",
  "NOT_AVAILABLE",
] as const;

export type CustomerEventStatus = (typeof customerEventStatuses)[number];

export const customerEventStatusLabels: Record<CustomerEventStatus, string> = {
  REQUEST_SUBMITTED: "Request Submitted",
  UNDER_REVIEW: "Under Review",
  ADDITIONAL_INFORMATION_REQUIRED: "Additional Information Required",
  PROPOSAL_SHARED: "Proposal Shared",
  AWAITING_CUSTOMER_CONFIRMATION: "Awaiting Customer Confirmation",
  CONFIRMED: "Confirmed",
  IN_PREPARATION: "In Preparation",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NOT_AVAILABLE: "Not Available",
};

export function getCustomerEventStatus(
  eventStatus: string | null,
  enquiryStatus: string | null,
): CustomerEventStatus {
  if (eventStatus === "CONFIRMED") return "CONFIRMED";
  if (eventStatus === "IN_PREPARATION" || eventStatus === "READY" || eventStatus === "IN_PROGRESS") {
    return "IN_PREPARATION";
  }
  if (eventStatus === "COMPLETED") return "COMPLETED";
  if (eventStatus === "CANCELLED") return "CANCELLED";

  if (enquiryStatus === "CONVERTED") {
    return "AWAITING_CUSTOMER_CONFIRMATION";
  }
  if (enquiryStatus === "WAITING_FOR_CUSTOMER") {
    return "ADDITIONAL_INFORMATION_REQUIRED";
  }
  if (enquiryStatus === "FOLLOW_UP_REQUIRED") return "PROPOSAL_SHARED";
  if (eventStatus === "DRAFT" || eventStatus === "PENDING_APPROVAL") {
    return "UNDER_REVIEW";
  }

  switch (enquiryStatus) {
    case "NEW":
      return "REQUEST_SUBMITTED";
    case "OPEN":
    case "IN_PROGRESS":
      return "UNDER_REVIEW";
    case "CONVERTED":
      return "AWAITING_CUSTOMER_CONFIRMATION";
    case "CLOSED":
    case "LOST":
      return "NOT_AVAILABLE";
    default:
      return "UNDER_REVIEW";
  }
}
