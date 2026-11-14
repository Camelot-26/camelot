export const bookingStatuses = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "NO_SHOW",
] as const;

export const bookingTypes = ["Dining", "Private dining", "Other"] as const;

export type BookingStatusValue = (typeof bookingStatuses)[number];
export type BookingTypeValue = (typeof bookingTypes)[number];

export type BookingInput = {
  id?: string;
  customerId: string;
  bookingType: string;
  bookingDate: string;
  bookingTime: string;
  adults: number;
  children: number;
  occasion: string;
  specialRequests: string;
  additionalNotes: string;
  assignedAgentId: string;
  internalNotes: string;
  status: string;
};

export type BookingActionResult =
  | { success: true }
  | { success: false; message: string };
