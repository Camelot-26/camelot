export const enquiryStatuses = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "FOLLOW_UP_REQUIRED",
  "CONVERTED",
  "CLOSED",
  "LOST",
] as const;

export const enquiryPriorities = ["LOW", "MEDIUM", "HIGH"] as const;

export const enquiryTypes = [
  "Dining",
  "General dining",
  "Group dining",
  "Birthday celebration",
  "Private event",
  "Corporate event",
  "Venue information",
  "Menu and pricing",
  "Other",
] as const;

export const enquirySources = [
  "Website",
  "Customer Portal",
  "Phone",
  "Email",
  "Walk-in",
  "Social media",
  "Other",
] as const;

export const customerEnquiryTypes = [
  { label: "General Inquiry", value: "General dining" },
  { label: "Dining", value: "Dining" },
  { label: "Group Dining", value: "Group dining" },
  { label: "Birthday", value: "Birthday celebration" },
  { label: "Private Event", value: "Private event" },
  { label: "Corporate Event", value: "Corporate event" },
  { label: "Menu and Pricing", value: "Menu and pricing" },
  { label: "Venue Information", value: "Venue information" },
  { label: "Other", value: "Other" },
] as const;

export type EnquiryStatusValue = (typeof enquiryStatuses)[number];
export type EnquiryPriorityValue = (typeof enquiryPriorities)[number];
export type EnquiryTypeValue = (typeof enquiryTypes)[number];
export type EnquirySourceValue = (typeof enquirySources)[number];

export type EnquiryInput = {
  id?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  subject: string;
  enquiryType: string;
  description: string;
  source: string;
  priority: string;
  status: string;
  assignedAgentId: string;
  internalNotes: string;
  statusRemarks: string;
};

export type EnquiryActionResult =
  | { success: true; enquiryNumber?: string; bookingNumber?: string }
  | { success: false; message: string };
