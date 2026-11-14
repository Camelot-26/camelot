import { bookingTypes, type BookingTypeValue } from "@/lib/booking-constants";

export type BookingDetailsInput = {
  bookingType: string;
  bookingDate: string;
  bookingTime: string;
  adults: number;
  children: number;
  occasion: string;
  specialRequests: string;
  additionalNotes: string;
};

export function validateBookingDetails(input: BookingDetailsInput) {
  if (!bookingTypes.includes(input.bookingType as BookingTypeValue)) {
    return "Select a valid booking type.";
  }
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(input.bookingDate)
    ? new Date(`${input.bookingDate}T00:00:00.000Z`)
    : null;
  if (
    !parsedDate ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== input.bookingDate
  ) {
    return "Enter a valid booking date.";
  }
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.bookingTime)) {
    return "Enter a valid booking time.";
  }
  if (
    !Number.isSafeInteger(input.adults) ||
    input.adults < 1 ||
    !Number.isSafeInteger(input.children) ||
    input.children < 0 ||
    !Number.isSafeInteger(input.adults + input.children)
  ) {
    return "Enter a valid number of guests.";
  }
  if (
    input.occasion.length > 100 ||
    input.specialRequests.length > 2000 ||
    input.additionalNotes.length > 2000
  ) {
    return "Booking notes exceed the allowed length.";
  }
  return null;
}
