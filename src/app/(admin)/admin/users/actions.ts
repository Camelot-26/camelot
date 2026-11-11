"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { getAuth } from "@/lib/auth";
import { requireUserRole } from "@/lib/authorization";
import { createSmtpTransport, sendTemporaryPasswordEmail } from "@/lib/email";
import { getPrisma } from "@/lib/prisma";
import { getUserImageStorage } from "@/lib/user-image-storage";
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
  | { success: true; sessionsRevoked: boolean }
  | {
      success: false;
      message: string;
      passwordWasSet: boolean;
      sessionsRevoked?: boolean;
    };

const userRoles: UserRole[] = ["admin", "agent", "customer"];
const MAX_PROFILE_IMAGE_BYTES = 512 * 1024;
const MAX_PROFILE_IMAGE_DATA_URL_LENGTH =
  Math.ceil(MAX_PROFILE_IMAGE_BYTES / 3) * 4 + 64;

function parseUploadedImage(image: string) {
  const match =
    /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if (!match || image.length > MAX_PROFILE_IMAGE_DATA_URL_LENGTH) {
    return null;
  }

  const [, type, encodedImage] = match;
  const bytes = Buffer.from(encodedImage, "base64");
  if (
    bytes.length === 0 ||
    bytes.length > MAX_PROFILE_IMAGE_BYTES ||
    bytes.toString("base64") !== encodedImage
  ) {
    return null;
  }

  if (type === "png") {
    if (!bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )) {
      return null;
    }
    return { bytes, extension: "png" };
  }
  if (type === "jpeg") {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      return null;
    }
    return { bytes, extension: "jpg" };
  }
  if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { bytes, extension: "webp" };
  }
  return null;
}

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
  const uploadedImage = image.startsWith("data:")
    ? parseUploadedImage(image)
    : null;

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
  if (image.startsWith("data:")) {
    if (!uploadedImage) {
      return {
        success: false,
        message:
          "Upload a valid PNG, JPEG, or WebP image smaller than 512 KB.",
      };
    }
  } else if (image.length > 2048) {
    return { success: false, message: "Profile image URL is too long." };
  } else if (image) {
    const storedImagePattern =
      /^\/api\/user-images\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.(?:jpg|png|webp)$/;
    if (!storedImagePattern.test(image)) {
      try {
        const imageUrl = new URL(image);
        if (imageUrl.protocol !== "https:" && imageUrl.protocol !== "http:") {
          return {
            success: false,
            message: "Enter a valid profile image URL.",
          };
        }
      } catch {
        return { success: false, message: "Enter a valid profile image URL." };
      }
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

  let imageToSave = image;
  let uploadedImageKey: string | null = null;
  if (uploadedImage) {
    const filename = `${randomUUID()}.${uploadedImage.extension}`;
    uploadedImageKey = filename;
    try {
      await getUserImageStorage().save(filename, uploadedImage.bytes);
      imageToSave = `/api/user-images/${filename}`;
    } catch (error) {
      console.error("Could not save the uploaded user profile image.", error);
      return {
        success: false,
        message: "We couldn’t save the uploaded image. Please try again.",
      };
    }
  }

  const prisma = getPrisma();
  let previousImage: string | null = null;
  try {
    await prisma.$transaction(
      async (transaction) => {
        const currentUser = await transaction.user.findUnique({
          where: { id: changes.id },
          select: { role: true, email: true, image: true },
        });
        if (!currentUser) {
          throw new Error("This account no longer exists.");
        }
        previousImage = currentUser.image;

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
            image: imageToSave || null,
            role: changes.role,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (uploadedImageKey) {
      try {
        await getUserImageStorage().delete(uploadedImageKey);
      } catch (cleanupError) {
        console.error(
          "Could not remove a profile image after its account update failed.",
          cleanupError,
        );
      }
    }
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

  const previousUpload = previousImage
    ? /^\/api\/user-images\/([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.(?:jpg|png|webp))$/.exec(
        previousImage,
      )
    : null;
  if (previousUpload && previousImage !== imageToSave) {
    try {
      await getUserImageStorage().delete(previousUpload[1]);
    } catch (error) {
      console.error("Could not remove the replaced user profile image.", error);
    }
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function issueTemporaryPassword(
  userId: string,
  requestedPassword: string | null,
): Promise<PasswordResult> {
  await requireUserRole("admin");
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) {
    return {
      success: false,
      message: "Your session expired. Sign in again.",
      passwordWasSet: false,
    };
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
      passwordWasSet: false,
    };
  }

  const user = await getPrisma().user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    return {
      success: false,
      message: "This account no longer exists.",
      passwordWasSet: false,
    };
  }

  if (
    requestedPassword !== null &&
    (typeof requestedPassword !== "string" ||
      requestedPassword.length < 12 ||
      requestedPassword.length > 128)
  ) {
    return {
      success: false,
      message: "A manually entered temporary password must be 12–128 characters.",
      passwordWasSet: false,
    };
  }

  let transport: ReturnType<typeof createSmtpTransport>;
  try {
    transport = createSmtpTransport();
    await transport.verify();
  } catch (error) {
    console.error("Could not verify the SMTP email configuration.", error);
    return {
      success: false,
      message:
        "Email delivery is unavailable. Check the SMTP settings before resetting this password.",
      passwordWasSet: false,
    };
  }

  const temporaryPassword =
    requestedPassword ?? randomBytes(18).toString("base64url");
  const auth = getAuth();
  let passwordWasSet = false;
  try {
    await auth.api.setUserPassword({
      body: { userId, newPassword: temporaryPassword },
      headers: requestHeaders,
    });
    passwordWasSet = true;
    await getPrisma().user.update({
      where: { id: userId },
      data: { passwordChangeRequired: true },
    });
  } catch (error) {
    console.error("Could not set a temporary password for the account.", error);
    return {
      success: false,
      message: passwordWasSet
        ? "The password changed, but the account could not be set to require a new password. No email was sent; contact support."
        : "The temporary password could not be set. No email was sent.",
      passwordWasSet,
    };
  }

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

  try {
    await sendTemporaryPasswordEmail(transport, {
      name: user.name,
      email: user.email,
      password: temporaryPassword,
    });
  } catch (error) {
    console.error("Temporary password was set, but email delivery failed.", error);
    revalidatePath("/admin/users");
    return {
      success: false,
      message:
        "The password was changed, but the email could not be sent. Check SMTP delivery, then issue a new temporary password.",
      passwordWasSet: true,
      sessionsRevoked,
    };
  }

  revalidatePath("/admin/users");
  return { success: true, sessionsRevoked };
}
