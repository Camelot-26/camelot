"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import {
  hasAdminPermission,
  normalizeAdminPermissions,
} from "@/lib/admin-permissions";
import { requireAdminPermission } from "@/lib/authorization";
import { getPrisma } from "@/lib/prisma";

type RoleActionResult = { success: true } | { success: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function saveAdminRole(value: unknown): Promise<RoleActionResult> {
  const actor = await requireAdminPermission("roles.manage");
  if (
    !isRecord(value) ||
    typeof value.name !== "string" ||
    typeof value.description !== "string" ||
    !Array.isArray(value.permissions) ||
    (value.id !== undefined && typeof value.id !== "string")
  ) {
    return { success: false, message: "Enter the required role information." };
  }

  const name = value.name.trim();
  const description = value.description.trim();
  const id = typeof value.id === "string" ? value.id.trim() : undefined;
  const permissions = normalizeAdminPermissions(value.permissions);
  if (
    !actor.isSuperAdmin &&
    permissions.some(
      (permission) =>
        !hasAdminPermission(actor.adminPermissions, permission, false),
    )
  ) {
    return {
      success: false,
      message: "You can only grant permissions that your own role has.",
    };
  }
  if (!name || name.length > 80) {
    return { success: false, message: "Enter a role name of 1 to 80 characters." };
  }
  if (description.length > 240) {
    return { success: false, message: "Description must be 240 characters or fewer." };
  }
  if (id !== undefined && (!id || id.length > 128)) {
    return { success: false, message: "Select a valid role." };
  }

  const prisma = getPrisma();
  try {
    if (id) {
      const currentRole = await prisma.adminRole.findUnique({
        where: { id },
        select: { permissions: true },
      });
      if (!currentRole) {
        return { success: false, message: "This role no longer exists." };
      }
      if (
        !actor.isSuperAdmin &&
        (id === actor.adminRoleId ||
          currentRole.permissions.some(
            (permission) =>
              !hasAdminPermission(actor.adminPermissions, permission, false),
          ))
      ) {
        return {
          success: false,
          message: "You can’t modify this role or your own assigned role.",
        };
      }
      await prisma.adminRole.update({
        where: { id },
        data: { name, description: description || null, permissions },
      });
    } else {
      await prisma.adminRole.create({
        data: {
          id: randomUUID(),
          name,
          description: description || null,
          permissions,
        },
      });
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, message: "A role with this name already exists." };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, message: "This role no longer exists." };
    }
    throw error;
  }

  revalidatePath("/admin/roles");
  revalidatePath("/admin/permissions");
  revalidatePath("/admin/admin-users");
  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteAdminRole(value: unknown): Promise<RoleActionResult> {
  const actor = await requireAdminPermission("roles.manage");
  if (typeof value !== "string" || !value.trim() || value.length > 128) {
    return { success: false, message: "Select a valid role." };
  }

  const prisma = getPrisma();
  const role = await prisma.adminRole.findUnique({
    where: { id: value },
    select: { permissions: true },
  });
  if (!role) {
    return { success: false, message: "This role no longer exists." };
  }
  if (
    !actor.isSuperAdmin &&
    (value === actor.adminRoleId ||
      role.permissions.some(
        (permission) =>
          !hasAdminPermission(actor.adminPermissions, permission, false),
      ))
  ) {
    return {
      success: false,
      message: "You can’t delete this role or your own assigned role.",
    };
  }
  const assignedUsers = await prisma.user.count({
    where: { adminRoleId: value },
  });
  if (assignedUsers > 0) {
    return {
      success: false,
      message: "Reassign this role’s admin users before deleting it.",
    };
  }

  try {
    await prisma.adminRole.delete({ where: { id: value } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2025" || error.code === "P2003")
    ) {
      return {
        success: false,
        message: "This role is in use or no longer exists.",
      };
    }
    throw error;
  }

  revalidatePath("/admin/roles");
  revalidatePath("/admin/permissions");
  return { success: true };
}
