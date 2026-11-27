CREATE TABLE "admin_role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_role_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "user" ADD COLUMN "adminRoleId" TEXT;

CREATE UNIQUE INDEX "admin_role_name_key" ON "admin_role"("name");
CREATE INDEX "user_adminRoleId_idx" ON "user"("adminRoleId");

ALTER TABLE "user"
ADD CONSTRAINT "user_adminRoleId_fkey"
FOREIGN KEY ("adminRoleId") REFERENCES "admin_role"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
