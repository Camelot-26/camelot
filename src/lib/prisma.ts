import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
};

// Bump this when regenerating Prisma after a schema change; the dev global survives HMR.
const prismaSchemaVersion = "customer-event-request-metadata-v1";

export function getPrisma() {
  const currentPrisma = globalForPrisma.prisma;
  if (
    globalForPrisma.prismaSchemaVersion === prismaSchemaVersion &&
    currentPrisma?.booking &&
    currentPrisma.event &&
    currentPrisma.eventCategory &&
    currentPrisma.bookingCancellationRequest
  ) {
    return currentPrisma;
  }

  if (currentPrisma) {
    const stalePrisma = currentPrisma;
    delete globalForPrisma.prisma;
    delete globalForPrisma.prismaSchemaVersion;
    void stalePrisma
      .$disconnect()
      .catch((error) =>
        console.error("Could not disconnect a stale Prisma client.", error),
      );
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and configure your PostgreSQL connection.",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  globalForPrisma.prisma = new PrismaClient({ adapter });
  globalForPrisma.prismaSchemaVersion = prismaSchemaVersion;
  return globalForPrisma.prisma;
}
