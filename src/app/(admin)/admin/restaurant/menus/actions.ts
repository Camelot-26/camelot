"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireAdminPermission } from "@/lib/authorization";
import { getPrisma } from "@/lib/prisma";

type MenuItemInput = {
  id?: string;
  name: string;
  categoryId: string;
  description: string;
  price: string;
  isAvailable: boolean;
};

type ActionResult = { success: true } | { success: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMenuItem(value: unknown): MenuItemInput | string {
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.categoryId !== "string" ||
    typeof value.description !== "string" ||
    typeof value.price !== "string" ||
    typeof value.isAvailable !== "boolean" ||
    (value.id !== undefined && typeof value.id !== "string")
  ) {
    return "Enter the required menu item information.";
  }

  const input: MenuItemInput = {
    ...(typeof value.id === "string" ? { id: value.id.trim() } : {}),
    name: value.name.trim(),
    categoryId: value.categoryId.trim(),
    description: value.description.trim(),
    price: value.price.trim(),
    isAvailable: value.isAvailable,
  };

  if (!input.name || input.name.length > 120) {
    return "Enter a name of 1 to 120 characters.";
  }
  if (!input.categoryId || input.categoryId.length > 128) {
    return "Select a menu category.";
  }
  if (input.description.length > 2000) {
    return "Description must be 2,000 characters or fewer.";
  }
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(input.price)) {
    return "Enter a valid price with up to two decimal places.";
  }
  if (input.id !== undefined && (!input.id || input.id.length > 128)) {
    return "This menu item could not be found.";
  }

  return input;
}

export async function saveMenuItem(value: unknown): Promise<ActionResult> {
  await requireAdminPermission("restaurant.manage");
  const parsed = parseMenuItem(value);
  if (typeof parsed === "string") {
    return { success: false, message: parsed };
  }

  const prisma = getPrisma();
  const category = await prisma.menuCategory.findUnique({
    where: { id: parsed.categoryId },
    select: { id: true, isActive: true },
  });
  if (!category) {
    return { success: false, message: "Select an existing menu category." };
  }
  if (!category.isActive) {
    const existing = parsed.id
      ? await prisma.menuItem.findUnique({
          where: { id: parsed.id },
          select: { categoryId: true },
        })
      : null;
    if (!existing) {
      return {
        success: false,
        message: "Choose an active category for a new menu item.",
      };
    }
    if (existing.categoryId !== category.id) {
      return {
        success: false,
        message: "Unavailable categories cannot be assigned to menu items.",
      };
    }
  }

  const data = {
    name: parsed.name,
    categoryId: parsed.categoryId,
    description: parsed.description,
    price: new Prisma.Decimal(parsed.price),
    isAvailable: parsed.isAvailable,
  };

  try {
    if (parsed.id) {
      await prisma.menuItem.update({ where: { id: parsed.id }, data });
    } else {
      await prisma.menuItem.create({
        data: { id: randomUUID(), ...data },
      });
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, message: "This menu item no longer exists." };
    }
    throw error;
  }

  revalidatePath("/admin/restaurant/menus");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function deleteMenuItem(value: unknown): Promise<ActionResult> {
  await requireAdminPermission("restaurant.manage");
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !value.id.trim() ||
    value.id.length > 128
  ) {
    return { success: false, message: "Select a valid menu item." };
  }

  try {
    await getPrisma().menuItem.delete({ where: { id: value.id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, message: "This menu item no longer exists." };
    }
    throw error;
  }

  revalidatePath("/admin/restaurant/menus");
  revalidatePath("/admin/dashboard");
  return { success: true };
}
