CREATE TYPE "EnquiryStatus" AS ENUM (
    'NEW',
    'OPEN',
    'IN_PROGRESS',
    'WAITING_FOR_CUSTOMER',
    'FOLLOW_UP_REQUIRED',
    'CONVERTED',
    'CLOSED',
    'LOST'
);

CREATE TYPE "EnquiryPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "EnquiryFollowupStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

CREATE TABLE "enquiry" (
    "id" TEXT NOT NULL,
    "enquiry_number" TEXT NOT NULL,
    "customer_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT,
    "customer_phone" TEXT,
    "subject" TEXT NOT NULL,
    "enquiry_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "priority" "EnquiryPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "assigned_agent_id" TEXT,
    "assigned_by" TEXT,
    "assigned_at" TIMESTAMP(3),
    "internal_notes" TEXT,
    "next_follow_up_at" TIMESTAMP(3),
    "converted_booking_id" TEXT,
    "created_by" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enquiry_status_history" (
    "id" TEXT NOT NULL,
    "enquiry_id" TEXT NOT NULL,
    "previous_status" "EnquiryStatus",
    "new_status" "EnquiryStatus" NOT NULL,
    "remarks" TEXT,
    "changed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiry_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enquiry_followups" (
    "id" TEXT NOT NULL,
    "enquiry_id" TEXT NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "scheduled_time" VARCHAR(5),
    "notes" TEXT,
    "status" "EnquiryFollowupStatus" NOT NULL DEFAULT 'SCHEDULED',
    "completed_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiry_followups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "enquiry_activities" (
    "id" TEXT NOT NULL,
    "enquiry_id" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiry_activities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "enquiry_enquiry_number_key" ON "enquiry"("enquiry_number");
CREATE UNIQUE INDEX "enquiry_converted_booking_id_key" ON "enquiry"("converted_booking_id");
CREATE INDEX "enquiry_customer_id_idx" ON "enquiry"("customer_id");
CREATE INDEX "enquiry_assigned_agent_id_idx" ON "enquiry"("assigned_agent_id");
CREATE INDEX "enquiry_assigned_by_idx" ON "enquiry"("assigned_by");
CREATE INDEX "enquiry_created_by_idx" ON "enquiry"("created_by");
CREATE INDEX "enquiry_status_idx" ON "enquiry"("status");
CREATE INDEX "enquiry_priority_idx" ON "enquiry"("priority");
CREATE INDEX "enquiry_enquiry_type_idx" ON "enquiry"("enquiry_type");
CREATE INDEX "enquiry_created_at_idx" ON "enquiry"("created_at");
CREATE INDEX "enquiry_next_follow_up_at_idx" ON "enquiry"("next_follow_up_at");
CREATE INDEX "enquiry_deleted_at_idx" ON "enquiry"("deleted_at");
CREATE INDEX "enquiry_status_history_enquiry_id_created_at_idx"
    ON "enquiry_status_history"("enquiry_id", "created_at");
CREATE INDEX "enquiry_status_history_changed_by_idx"
    ON "enquiry_status_history"("changed_by");
CREATE INDEX "enquiry_followups_enquiry_id_scheduled_date_idx"
    ON "enquiry_followups"("enquiry_id", "scheduled_date");
CREATE INDEX "enquiry_followups_enquiry_id_status_scheduled_date_idx"
    ON "enquiry_followups"("enquiry_id", "status", "scheduled_date");
CREATE INDEX "enquiry_followups_status_scheduled_date_idx"
    ON "enquiry_followups"("status", "scheduled_date");
CREATE INDEX "enquiry_followups_created_by_idx"
    ON "enquiry_followups"("created_by");
CREATE INDEX "enquiry_activities_enquiry_id_created_at_idx"
    ON "enquiry_activities"("enquiry_id", "created_at");
CREATE INDEX "enquiry_activities_created_by_idx"
    ON "enquiry_activities"("created_by");

ALTER TABLE "enquiry"
    ADD CONSTRAINT "enquiry_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "enquiry"
    ADD CONSTRAINT "enquiry_assigned_agent_id_fkey"
    FOREIGN KEY ("assigned_agent_id") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "enquiry"
    ADD CONSTRAINT "enquiry_assigned_by_fkey"
    FOREIGN KEY ("assigned_by") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "enquiry"
    ADD CONSTRAINT "enquiry_converted_booking_id_fkey"
    FOREIGN KEY ("converted_booking_id") REFERENCES "booking"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enquiry"
    ADD CONSTRAINT "enquiry_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enquiry_status_history"
    ADD CONSTRAINT "enquiry_status_history_enquiry_id_fkey"
    FOREIGN KEY ("enquiry_id") REFERENCES "enquiry"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enquiry_status_history"
    ADD CONSTRAINT "enquiry_status_history_changed_by_fkey"
    FOREIGN KEY ("changed_by") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "enquiry_followups"
    ADD CONSTRAINT "enquiry_followups_enquiry_id_fkey"
    FOREIGN KEY ("enquiry_id") REFERENCES "enquiry"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enquiry_followups"
    ADD CONSTRAINT "enquiry_followups_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enquiry_activities"
    ADD CONSTRAINT "enquiry_activities_enquiry_id_fkey"
    FOREIGN KEY ("enquiry_id") REFERENCES "enquiry"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enquiry_activities"
    ADD CONSTRAINT "enquiry_activities_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
