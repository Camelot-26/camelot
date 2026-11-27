"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireAdminPermission } from "@/lib/authorization";
import { getPrisma } from "@/lib/prisma";

type ActionResult = { success: true } | { success: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function saveMenuCategory(value: unknown): Promise<ActionResult> {
  await requireAdminPermission("restaurant.manage");
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.isActive !== "boolean" ||
    (value.id !== undefined && typeof value.id !== "string")
  ) {
    return { success: false, message: "Enter the required category information." };
  }

  const id = typeof value.id === "string" ? value.id.trim() : undefined;
  const name = value.name.trim();
  if (!name || name.length > 80) {
    return { success: false, message: "Enter a category name of 1 to 80 characters." };
  }
  if (id !== undefined && (!id || id.length > 128)) {
    return { success: false, message: "This menu category could not be found." };
  }

  const prisma = getPrisma();
  const duplicate = await prisma.menuCategory.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(id ? { id: { not: id } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) {
    return { success: false, message: "A menu category with this name already exists." };
  }

  try {
    if (id) {
      await prisma.menuCategory.update({
        where: { id },
        data: { name, isActive: value.isActive },
      });
    } else {
      await prisma.menuCategory.create({
        data: { id: randomUUID(), name, isActive: value.isActive },
      });
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, message: "This menu category no longer exists." };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, message: "A menu category with this name already exists." };
    }
    throw error;
  }

  revalidatePath("/admin/restaurant/categories");
  revalidatePath("/admin/restaurant/menus");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function deleteMenuCategory(value: unknown): Promise<ActionResult> {
  await requireAdminPermission("restaurant.manage");
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !value.id.trim() ||
    value.id.length > 128
  ) {
    return { success: false, message: "Select a valid menu category." };
  }

  const prisma = getPrisma();
  const itemCount = await prisma.menuItem.count({
    where: { categoryId: value.id },
  });
  if (itemCount > 0) {
    return {
      success: false,
      message: "Move or delete this category’s menu items before deleting it.",
    };
  }

  try {
    await prisma.menuCategory.delete({ where: { id: value.id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, message: "This menu category no longer exists." };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        success: false,
        message: "Move or delete this category’s menu items before deleting it.",
      };
    }
    throw error;
  }

  revalidatePath("/admin/restaurant/categories");
  revalidatePath("/admin/restaurant/menus");
  revalidatePath("/admin/dashboard");
  return { success: true };
}
