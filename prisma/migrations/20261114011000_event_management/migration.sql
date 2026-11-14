CREATE TYPE "EventStatus" AS ENUM (
    'DRAFT',
    'PENDING_APPROVAL',
    'CONFIRMED',
    'IN_PREPARATION',
    'READY',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE "EventTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "EventTaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "event_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "event_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "event_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "event_date" DATE NOT NULL,
    "setup_start_time" VARCHAR(5) NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "cleanup_end_time" VARCHAR(5) NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "cover_image" TEXT,
    "customer_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "contact_number" TEXT NOT NULL,
    "email_address" TEXT,
    "company_name" TEXT,
    "expected_guests" INTEGER NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL DEFAULT 0,
    "occasion" TEXT,
    "seating_arrangement" TEXT,
    "venue" TEXT NOT NULL,
    "venue_capacity" INTEGER,
    "venue_requirements" TEXT,
    "food_beverage_requirements" TEXT,
    "decoration_requirements" TEXT,
    "entertainment_requirements" TEXT,
    "additional_notes" TEXT,
    "assigned_coordinator_id" TEXT,
    "assigned_agent_id" TEXT,
    "assigned_by" TEXT,
    "assigned_at" TIMESTAMP(3),
    "internal_notes" TEXT,
    "enquiry_id" TEXT,
    "booking_id" TEXT,
    "created_by" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_status_history" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "previous_status" "EventStatus",
    "new_status" "EventStatus" NOT NULL,
    "remarks" TEXT,
    "changed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_status_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_activities" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "activity_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_assignment_history" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "previous_coordinator_id" TEXT,
    "new_coordinator_id" TEXT,
    "previous_agent_id" TEXT,
    "new_agent_id" TEXT,
    "changed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "event_assignment_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_checklist_items" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assigned_to" TEXT,
    "due_date" DATE,
    "priority" "EventTaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "EventTaskStatus" NOT NULL DEFAULT 'PENDING',
    "completed_by" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "event_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "event_categories_name_key" ON "event_categories"("name");
CREATE UNIQUE INDEX "event_categories_slug_key" ON "event_categories"("slug");
CREATE INDEX "event_categories_is_active_name_idx" ON "event_categories"("is_active", "name");
CREATE UNIQUE INDEX "events_event_number_key" ON "events"("event_number");
CREATE INDEX "events_category_id_idx" ON "events"("category_id");
CREATE INDEX "events_customer_id_idx" ON "events"("customer_id");
CREATE INDEX "events_assigned_coordinator_id_idx" ON "events"("assigned_coordinator_id");
CREATE INDEX "events_assigned_agent_id_idx" ON "events"("assigned_agent_id");
CREATE INDEX "events_assigned_by_idx" ON "events"("assigned_by");
CREATE INDEX "events_created_by_idx" ON "events"("created_by");
CREATE INDEX "events_event_date_status_idx" ON "events"("event_date", "status");
CREATE INDEX "events_status_idx" ON "events"("status");
CREATE INDEX "events_venue_event_date_idx" ON "events"("venue", "event_date");
CREATE INDEX "events_enquiry_id_idx" ON "events"("enquiry_id");
CREATE INDEX "events_booking_id_idx" ON "events"("booking_id");
CREATE INDEX "events_created_at_idx" ON "events"("created_at");
CREATE INDEX "events_deleted_at_idx" ON "events"("deleted_at");
CREATE INDEX "event_status_history_event_id_created_at_idx" ON "event_status_history"("event_id", "created_at");
CREATE INDEX "event_status_history_changed_by_idx" ON "event_status_history"("changed_by");
CREATE INDEX "event_activities_event_id_created_at_idx" ON "event_activities"("event_id", "created_at");
CREATE INDEX "event_activities_created_by_idx" ON "event_activities"("created_by");
CREATE INDEX "event_assignment_history_event_id_created_at_idx" ON "event_assignment_history"("event_id", "created_at");
CREATE INDEX "event_assignment_history_changed_by_idx" ON "event_assignment_history"("changed_by");
CREATE INDEX "event_checklist_items_event_id_status_idx" ON "event_checklist_items"("event_id", "status");
CREATE INDEX "event_checklist_items_assigned_to_idx" ON "event_checklist_items"("assigned_to");
CREATE INDEX "event_checklist_items_due_date_status_idx" ON "event_checklist_items"("due_date", "status");
CREATE INDEX "event_checklist_items_created_by_idx" ON "event_checklist_items"("created_by");

ALTER TABLE "events" ADD CONSTRAINT "events_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "event_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_assigned_coordinator_id_fkey"
    FOREIGN KEY ("assigned_coordinator_id") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_assigned_agent_id_fkey"
    FOREIGN KEY ("assigned_agent_id") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_assigned_by_fkey"
    FOREIGN KEY ("assigned_by") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_enquiry_id_fkey"
    FOREIGN KEY ("enquiry_id") REFERENCES "enquiry"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "booking"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_status_history" ADD CONSTRAINT "event_status_history_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_status_history" ADD CONSTRAINT "event_status_history_changed_by_fkey"
    FOREIGN KEY ("changed_by") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_activities" ADD CONSTRAINT "event_activities_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_assignment_history" ADD CONSTRAINT "event_assignment_history_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_assignment_history" ADD CONSTRAINT "event_assignment_history_previous_coordinator_id_fkey"
    FOREIGN KEY ("previous_coordinator_id") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_assignment_history" ADD CONSTRAINT "event_assignment_history_new_coordinator_id_fkey"
    FOREIGN KEY ("new_coordinator_id") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_assignment_history" ADD CONSTRAINT "event_assignment_history_previous_agent_id_fkey"
    FOREIGN KEY ("previous_agent_id") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_assignment_history" ADD CONSTRAINT "event_assignment_history_new_agent_id_fkey"
    FOREIGN KEY ("new_agent_id") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_assignment_history" ADD CONSTRAINT "event_assignment_history_changed_by_fkey"
    FOREIGN KEY ("changed_by") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_checklist_items" ADD CONSTRAINT "event_checklist_items_event_id_fkey"
    FOREIGN KEY ("event_id") REFERENCES "events"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_checklist_items" ADD CONSTRAINT "event_checklist_items_assigned_to_fkey"
    FOREIGN KEY ("assigned_to") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_checklist_items" ADD CONSTRAINT "event_checklist_items_completed_by_fkey"
    FOREIGN KEY ("completed_by") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_checklist_items" ADD CONSTRAINT "event_checklist_items_created_by_fkey"
    FOREIGN KEY ("created_by") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "event_categories" ("id", "name", "slug", "is_active", "updated_at") VALUES
    ('event-category-birthday', 'Birthday Celebration', 'birthday-celebration', true, CURRENT_TIMESTAMP),
    ('event-category-private-dining', 'Private Dining', 'private-dining', true, CURRENT_TIMESTAMP),
    ('event-category-corporate', 'Corporate Event', 'corporate-event', true, CURRENT_TIMESTAMP),
    ('event-category-group', 'Group Celebration', 'group-celebration', true, CURRENT_TIMESTAMP),
    ('event-category-party', 'Private Party', 'private-party', true, CURRENT_TIMESTAMP),
    ('event-category-special', 'Special Occasion', 'special-occasion', true, CURRENT_TIMESTAMP),
    ('event-category-live', 'Live Entertainment', 'live-entertainment', true, CURRENT_TIMESTAMP),
    ('event-category-other', 'Other', 'other-event', true, CURRENT_TIMESTAMP);
