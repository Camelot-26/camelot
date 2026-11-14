CREATE TYPE "BookingCancellationRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);

CREATE TABLE "booking_cancellation_request" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "BookingCancellationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_cancellation_request_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "booking_cancellation_request_booking_id_status_idx"
    ON "booking_cancellation_request"("booking_id", "status");
CREATE INDEX "booking_cancellation_request_customer_id_created_at_idx"
    ON "booking_cancellation_request"("customer_id", "created_at");

ALTER TABLE "booking_cancellation_request"
    ADD CONSTRAINT "booking_cancellation_request_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "booking"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "booking_cancellation_request"
    ADD CONSTRAINT "booking_cancellation_request_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
