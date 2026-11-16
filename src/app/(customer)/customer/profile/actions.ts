"use server";

import { randomUUID } from "node:crypto";
import { APIError } from "better-auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { requireUserRole } from "@/lib/authorization";
import { getCustomerBookingUser } from "@/lib/customer-booking";
import { getPrisma } from "@/lib/prisma";
import { getUserImageStorage } from "@/lib/user-image-storage";
import { parseUploadedProfileImage } from "@/lib/user-profile-image";

type CustomerProfileResult =
  | { success: true }
  | { success: false; message: string };

export async function updateCustomerProfile(
  changes: unknown,
): Promise<CustomerProfileResult> {
  const customer = await getCustomerBookingUser();
  if (!customer) {
    return { success: false, message: "Your session expired. Sign in again." };
  }
  if (
    typeof changes !== "object" ||
    changes === null ||
    !("name" in changes) ||
    !("phone" in changes) ||
    typeof changes.name !== "string" ||
    typeof changes.phone !== "string"
  ) {
    return { success: false, message: "Enter your name and phone number." };
  }
  let image: string | undefined;
  if ("image" in changes) {
    if (typeof changes.image !== "string") {
      return { success: false, message: "Choose a valid profile image." };
    }
    image = changes.image.trim();
  }
  const hasImageChange = image !== undefined;

  const name = changes.name.trim();
  const phone = changes.phone.trim();
  if (!name || name.length > 100) {
    return {
      success: false,
      message: "Enter a name between 1 and 100 characters.",
    };
  }
  if (phone.length > 40) {
    return {
      success: false,
      message: "Phone number must be 40 characters or less.",
    };
  }

  let imageToSave: string | null | undefined;
  let uploadedImageKey: string | null = null;
  if (hasImageChange) {
    imageToSave = null;
    if (image) {
      const uploadedImage = parseUploadedProfileImage(image);
      if (!uploadedImage) {
        return {
          success: false,
          message:
            "Upload a valid PNG, JPEG, or WebP image smaller than 512 KB.",
        };
      }

      uploadedImageKey = `${randomUUID()}.${uploadedImage.extension}`;
      try {
        await getUserImageStorage().save(uploadedImageKey, uploadedImage.bytes);
      } catch (error) {
        console.error("Could not save the uploaded customer profile image.", error);
        return {
          success: false,
          message: "We couldn’t save the uploaded image. Please try again.",
        };
      }
      imageToSave = `/api/user-images/${uploadedImageKey}`;
    }
  }

  let previousImage: string | null = null;
  let profileUpdated = false;
  try {
    await getPrisma().$transaction(async (transaction) => {
      const currentCustomer = await transaction.user.findFirst({
        where: { id: customer.id, role: "customer", banned: false },
        select: { image: true },
      });
      if (!currentCustomer) return;

      previousImage = currentCustomer.image;
      const result = await transaction.user.updateMany({
        where: { id: customer.id, role: "customer", banned: false },
        data: {
          name,
          phone: phone || null,
          ...(hasImageChange ? { image: imageToSave } : {}),
        },
      });
      profileUpdated = result.count === 1;
    });
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
    throw error;
  }

  if (!profileUpdated) {
    if (uploadedImageKey) {
      try {
        await getUserImageStorage().delete(uploadedImageKey);
      } catch (error) {
        console.error(
          "Could not remove an uploaded image after the profile became unavailable.",
          error,
        );
      }
    }
    return {
      success: false,
      message: "Your customer profile is no longer available.",
    };
  }

  const previousUpload = previousImage
    ? /^\/api\/user-images\/([0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.(?:jpg|png|webp))$/.exec(
        previousImage,
      )
    : null;
  if (
    hasImageChange &&
    previousUpload &&
    previousImage !== imageToSave
  ) {
    try {
      await getUserImageStorage().delete(previousUpload[1]);
    } catch (error) {
      console.error("Could not remove the replaced customer profile image.", error);
    }
  }

  revalidatePath("/customer/profile");
  revalidatePath("/customer/dashboard");
  return { success: true };
}

export async function changeCustomerPassword(
  currentPassword: unknown,
  newPassword: unknown,
): Promise<CustomerProfileResult> {
  await requireUserRole("customer");
  if (
    typeof currentPassword !== "string" ||
    !currentPassword ||
    typeof newPassword !== "string" ||
    newPassword.length < 8 ||
    newPassword.length > 128
  ) {
    return {
      success: false,
      message: "Enter your current password and choose a new password between 8 and 128 characters.",
    };
  }

  const requestHeaders = await headers();
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session || session.user.role !== "customer") {
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
        message: error.message || "Your current password was not accepted.",
      };
    }
    throw error;
  }

  revalidatePath("/customer/profile");
  return { success: true };
}
