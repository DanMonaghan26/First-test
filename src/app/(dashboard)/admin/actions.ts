"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

export type ActionState = { error?: string } | undefined;

const MEMBER_COLORS = [
  "#f97316",
  "#6366f1",
  "#10b981",
  "#ec4899",
  "#0ea5e9",
  "#eab308",
  "#a855f7",
];

export async function addMember(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "MEMBER";

  if (!name || !email || password.length < 8) {
    return {
      error:
        "Please enter a name, a valid email, and a password of at least 8 characters.",
    };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "A family member with that email already exists." };
  }

  const memberCount = await prisma.user.count();
  const color = MEMBER_COLORS[memberCount % MEMBER_COLORS.length];
  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: { name, email, passwordHash, role, color },
  });

  revalidatePath("/admin");
  revalidatePath("/week");
  return undefined;
}

export async function resetPassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!userId || password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  revalidatePath("/admin");
  return undefined;
}

export async function removeMember(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;
  if (userId === admin.id) return;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) return;
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin");
  revalidatePath("/week");
}

export async function createDisplayLink(): Promise<void> {
  await requireAdmin();
  const token = randomBytes(24).toString("base64url");
  await prisma.displayToken.create({ data: { token, label: "Kitchen TV" } });
  revalidatePath("/admin");
}

export async function deleteDisplayLink(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.displayToken.delete({ where: { id } });
  revalidatePath("/admin");
}
