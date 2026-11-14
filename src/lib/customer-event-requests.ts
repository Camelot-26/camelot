export type CustomerEventRequestDetails = {
  eventName: string;
  categoryId: string;
  categoryName: string;
  eventDescription: string;
  preferredDate: string;
  preferredStartTime: string;
  preferredEndTime: string;
  companyName: string;
  expectedGuests: number;
  adults: number;
  children: number;
  seatingArrangement: string;
  foodBeverageRequirements: string;
  decorationRequirements: string;
  entertainmentRequirements: string;
  specialRequirements: string;
  additionalNotes: string;
};

const requestPrefix = "CAMELOT_CUSTOMER_EVENT_REQUEST_V1\n";

export function serializeCustomerEventRequest(
  details: CustomerEventRequestDetails,
) {
  return `${requestPrefix}${JSON.stringify(details)}`;
}

export function parseCustomerEventRequest(
  description: string,
): CustomerEventRequestDetails | null {
  if (!description.startsWith(requestPrefix)) return null;
  let value: unknown;
  try {
    value = JSON.parse(description.slice(requestPrefix.length));
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;

  const record = value as Record<string, unknown>;
  const stringKeys = [
    "eventName",
    "categoryId",
    "categoryName",
    "eventDescription",
    "preferredDate",
    "preferredStartTime",
    "preferredEndTime",
    "companyName",
    "seatingArrangement",
    "foodBeverageRequirements",
    "decorationRequirements",
    "entertainmentRequirements",
    "specialRequirements",
    "additionalNotes",
  ] as const;
  if (
    stringKeys.some((key) => typeof record[key] !== "string") ||
    !Number.isSafeInteger(record.expectedGuests) ||
    !Number.isSafeInteger(record.adults) ||
    !Number.isSafeInteger(record.children)
  ) {
    return null;
  }

  return record as CustomerEventRequestDetails;
}

export function formatCustomerEventRequest(
  details: CustomerEventRequestDetails,
) {
  return [
    `Event name: ${details.eventName}`,
    `Event category: ${details.categoryName}`,
    `Event description: ${details.eventDescription || "Not provided"}`,
    `Preferred date: ${details.preferredDate}`,
    `Preferred time: ${details.preferredStartTime}–${details.preferredEndTime}`,
    `Company: ${details.companyName || "Not provided"}`,
    `Expected guests: ${details.expectedGuests} (${details.adults} adults, ${details.children} children)`,
    `Preferred seating: ${details.seatingArrangement || "Not provided"}`,
    `Food and beverage: ${details.foodBeverageRequirements || "Not provided"}`,
    `Decorations: ${details.decorationRequirements || "Not provided"}`,
    `Entertainment: ${details.entertainmentRequirements || "Not provided"}`,
    `Special requirements: ${details.specialRequirements || "Not provided"}`,
    `Additional notes: ${details.additionalNotes || "Not provided"}`,
  ].join("\n");
}
