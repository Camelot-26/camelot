import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AccountProfileForm } from "@/components/account/account-profile-form";
import { getAuth } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const instant = false;

export default function AgentProfilePage() {
  return (
    <Suspense fallback={<div className="customer-profile-page" role="status">Loading your profile…</div>}>
      <AgentProfileContent />
    </Suspense>
  );
}

async function AgentProfileContent() {
  await connection();
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "agent") redirect("/login?role=agent");

  const agent = await getPrisma().user.findFirst({
    where: { id: session.user.id, role: "agent", banned: false },
    select: { name: true, email: true, phone: true, image: true },
  });
  if (!agent) redirect("/login?role=agent");

  return (
    <div className="customer-profile-page">
      <AccountProfileForm {...agent} role="agent" />
    </div>
  );
}
