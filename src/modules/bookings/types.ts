export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export type Booking = {
  id: string;
  customerId: string;
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
};
