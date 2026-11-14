ALTER TABLE "enquiry"
    ADD COLUMN "event_category_id" TEXT,
    ADD COLUMN "preferred_event_date" DATE,
    ADD COLUMN "event_expected_guests" INTEGER;

CREATE INDEX "enquiry_event_category_id_preferred_event_date_idx"
    ON "enquiry"("event_category_id", "preferred_event_date");

ALTER TABLE "enquiry"
    ADD CONSTRAINT "enquiry_event_category_id_fkey"
    FOREIGN KEY ("event_category_id") REFERENCES "event_categories"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
