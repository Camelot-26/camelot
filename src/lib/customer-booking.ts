import "server-only";

import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { requireUserRole } from "@/lib/authorization";
import { getPrisma } from "@/lib/prisma";

export async function getCustomerBookingUser() {
  await requireUserRole("customer");
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "customer") {
    return null;
  }

  return getPrisma().user.findFirst({
    where: {
      id: session.user.id,
      role: "customer",
      banned: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  });
}
