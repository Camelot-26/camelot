"use server";

import { APIError } from "better-auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { requirePasswordChange } from "@/lib/authorization";
import { getPrisma } from "@/lib/prisma";
import type { UserRole } from "@/types";

const rolePaths: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  agent: "/agent/dashboard",
  customer: "/customer/dashboard",
};

type PasswordChangeResult =
  | { success: true; destination: string }
  | { success: false; message: string };

export async function completePasswordChange(
  currentPassword: string,
  newPassword: string,
): Promise<PasswordChangeResult> {
  await requirePasswordChange();
  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    newPassword.length < 8 ||
    newPassword.length > 128
  ) {
    return {
      success: false,
      message: "Choose a password between 8 and 128 characters.",
    };
  }

  const requestHeaders = await headers();
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) {
    return { success: false, message: "Your session expired. Sign in again." };
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      },
      headers: requestHeaders,
    });
  } catch (error) {
    if (error instanceof APIError) {
      return {
        success: false,
        message:
          error.message || "The temporary password was not accepted. Try again.",
      };
    }
    throw error;
  }

  await getPrisma().user.update({
    where: { id: session.user.id },
    data: { passwordChangeRequired: false },
  });

  revalidatePath("/change-password");
  return {
    success: true,
    destination: rolePaths[session.user.role as UserRole],
  };
}
