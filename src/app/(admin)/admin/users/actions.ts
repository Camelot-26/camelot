"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { getAuth } from "@/lib/auth";
import { requireUserRole } from "@/lib/authorization";
import { getPrisma } from "@/lib/prisma";
import type { UserRole } from "@/types";

type AdminUserChanges = {
  id: string;
  name: string;
  email: string;
  phone: string;
  image: string;
  role: UserRole;
};

type ActionResult =
  | { success: true }
  | { success: false; message: string };

type PasswordResult =
  | {
      success: true;
      temporaryPassword: string;
      sessionsRevoked: boolean;
    }
  | { success: false; message: string };

const userRoles: UserRole[] = ["admin", "agent", "customer"];

function isUserRole(role: string): role is UserRole {
  return userRoles.includes(role as UserRole);
}

function isUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function updateAdminUser(
  changes: AdminUserChanges,
): Promise<ActionResult> {
  await requireUserRole("admin");
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) {
    return { success: false, message: "Your session expired. Sign in again." };
  }
  if (
    typeof changes !== "object" ||
    changes === null ||
    typeof changes.id !== "string" ||
    typeof changes.name !== "string" ||
    typeof changes.email !== "string" ||
    typeof changes.phone !== "string" ||
    typeof changes.image !== "string" ||
    typeof changes.role !== "string"
  ) {
    return { success: false, message: "The account details are incomplete." };
  }

  const name = changes.name.trim();
  const email = changes.email.trim().toLowerCase();
  const phone = changes.phone.trim();
  const image = changes.image.trim();

  if (!changes.id || changes.id.length > 128 || name.length < 1 || name.length > 100) {
    return { success: false, message: "Enter a name between 1 and 100 characters." };
  }
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { success: false, message: "Enter a valid email address." };
  }
  if (phone.length > 40) {
    return { success: false, message: "Phone number must be 40 characters or less." };
  }
  if (image.length > 2048) {
    return { success: false, message: "Profile image URL is too long." };
  }
  if (image) {
    try {
      const imageUrl = new URL(image);
      if (imageUrl.protocol !== "https:" && imageUrl.protocol !== "http:") {
        return { success: false, message: "Enter a valid profile image URL." };
      }
    } catch {
      return { success: false, message: "Enter a valid profile image URL." };
    }
  }
  if (!isUserRole(changes.role)) {
    return { success: false, message: "Select a valid account type." };
  }
  if (changes.id === session.user.id && changes.role !== "admin") {
    return {
      success: false,
      message: "You cannot change your own administrator role.",
    };
  }

  const prisma = getPrisma();
  try {
    await prisma.$transaction(
      async (transaction) => {
        const currentUser = await transaction.user.findUnique({
          where: { id: changes.id },
          select: { role: true, email: true },
        });
        if (!currentUser) {
          throw new Error("This account no longer exists.");
        }

        if (currentUser.role === "admin" && changes.role !== "admin") {
          const adminCount = await transaction.user.count({
            where: { role: "admin" },
          });
          if (adminCount <= 1) {
            throw new Error("At least one administrator account must remain.");
          }
        }

        await transaction.user.update({
          where: { id: changes.id },
          data: {
            name,
            email,
            emailVerified:
              email === currentUser.email ? undefined : false,
            phone: phone || null,
            image: image || null,
            role: changes.role,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        message: "That email address is already associated with another account.",
      };
    }
    if (error instanceof Error && error.message === "This account no longer exists.") {
      return { success: false, message: error.message };
    }
    if (
      error instanceof Error &&
      error.message === "At least one administrator account must remain."
    ) {
      return { success: false, message: error.message };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return {
        success: false,
        message: "Another account change happened at the same time. Please try again.",
      };
    }
    throw error;
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function issueTemporaryPassword(
  userId: string,
): Promise<PasswordResult> {
  await requireUserRole("admin");
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) {
    return { success: false, message: "Your session expired. Sign in again." };
  }
  if (
    typeof userId !== "string" ||
    userId.length === 0 ||
    userId.length > 128 ||
    userId === session.user.id
  ) {
    return {
      success: false,
      message: "Use your own account settings to change your password.",
    };
  }

  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return { success: false, message: "This account no longer exists." };
  }

  const temporaryPassword = randomBytes(18).toString("base64url");
  const auth = getAuth();
  await auth.api.setUserPassword({
    body: { userId, newPassword: temporaryPassword },
    headers: requestHeaders,
  });
  await getPrisma().user.update({
    where: { id: userId },
    data: { passwordChangeRequired: true },
  });

  let sessionsRevoked = true;
  try {
    await auth.api.revokeUserSessions({
      body: { userId },
      headers: requestHeaders,
    });
  } catch (error) {
    console.error("Temporary password was set, but session revocation failed.", error);
    sessionsRevoked = false;
  }

  revalidatePath("/admin/users");
  return { success: true, temporaryPassword, sessionsRevoked };
}
