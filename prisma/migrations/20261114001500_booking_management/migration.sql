CREATE TYPE "BookingStatus" AS ENUM (
    'PENDING',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
    'REJECTED',
    'NO_SHOW'
);

CREATE TABLE "booking" (
    "id" TEXT NOT NULL,
    "booking_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "booking_type" TEXT NOT NULL,
    "booking_date" DATE NOT NULL,
    "booking_time" VARCHAR(5) NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL DEFAULT 0,
    "occasion" TEXT,
    "special_requests" TEXT,
    "additional_notes" TEXT,
    "assigned_agent_id" TEXT,
    "assigned_at" TIMESTAMP(3),
    "internal_notes" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "created_by" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "booking_status_history" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "previous_status" "BookingStatus",
    "new_status" "BookingStatus" NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "booking_booking_number_key" ON "booking"("booking_number");
CREATE INDEX "booking_customer_id_idx" ON "booking"("customer_id");
CREATE INDEX "booking_assigned_agent_id_idx" ON "booking"("assigned_agent_id");
CREATE INDEX "booking_created_by_idx" ON "booking"("created_by");
CREATE INDEX "booking_status_idx" ON "booking"("status");
CREATE INDEX "booking_booking_type_idx" ON "booking"("booking_type");
CREATE INDEX "booking_booking_date_idx" ON "booking"("booking_date");
CREATE INDEX "booking_booking_date_status_idx" ON "booking"("booking_date", "status");
CREATE INDEX "booking_created_at_idx" ON "booking"("created_at");
CREATE INDEX "booking_deleted_at_idx" ON "booking"("deleted_at");
CREATE INDEX "booking_status_history_booking_id_created_at_idx"
    ON "booking_status_history"("booking_id", "created_at");
CREATE INDEX "booking_status_history_updated_by_idx"
    ON "booking_status_history"("updated_by");

ALTER TABLE "booking"
    ADD CONSTRAINT "booking_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking"
    ADD CONSTRAINT "booking_assigned_agent_id_fkey"
    FOREIGN KEY ("assigned_agent_id") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "booking"
    ADD CONSTRAINT "booking_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking_status_history"
    ADD CONSTRAINT "booking_status_history_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "booking"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "booking_status_history"
    ADD CONSTRAINT "booking_status_history_updated_by_fkey"
    FOREIGN KEY ("updated_by") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
