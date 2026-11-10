ALTER TABLE "user"
ADD COLUMN "passwordChangeRequired" BOOLEAN NOT NULL DEFAULT false;

DROP INDEX IF EXISTS "user_single_admin_key";
