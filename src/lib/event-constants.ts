export const eventStatuses = [
  "DRAFT",
  "PENDING_APPROVAL",
  "CONFIRMED",
  "IN_PREPARATION",
  "READY",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export const eventTaskStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const;
export const eventTaskPriorities = ["LOW", "MEDIUM", "HIGH"] as const;

export type EventStatusValue = (typeof eventStatuses)[number];
export type EventTaskStatusValue = (typeof eventTaskStatuses)[number];
export type EventTaskPriorityValue = (typeof eventTaskPriorities)[number];

export type EventInput = {
  id?: string;
  name: string;
  categoryId: string;
  description: string;
  eventDate: string;
  setupStartTime: string;
  startTime: string;
  endTime: string;
  cleanupEndTime: string;
  status: EventStatusValue;
  coverImage: string;
  customerId: string;
  customerName: string;
  contactNumber: string;
  emailAddress: string;
  companyName: string;
  expectedGuests: number;
  adults: number;
  children: number;
  occasion: string;
  seatingArrangement: string;
  venue: string;
  venueCapacity: number | null;
  venueRequirements: string;
  foodBeverageRequirements: string;
  decorationRequirements: string;
  entertainmentRequirements: string;
  additionalNotes: string;
  assignedCoordinatorId: string;
  assignedAgentId: string;
  internalNotes: string;
  enquiryId: string;
  bookingId: string;
  statusRemarks: string;
};

export type EventActionResult =
  | { success: true; eventNumber?: string }
  | { success: false; message: string };
