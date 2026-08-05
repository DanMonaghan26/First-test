"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { RAINBOW_COLORS } from "@/lib/colors";

export type ActionState = { error?: string } | undefined;

function isValidColor(color: string): boolean {
  return RAINBOW_COLORS.some((c) => c.value === color);
}

export async function addMember(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "");
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "MEMBER";
  const sendInvite = formData.get("sendInvite") === "on";

  if (!name) {
    return { error: "Please enter a name." };
  }
  if (!isValidColor(color)) {
    return { error: "Please pick a colour." };
  }

  const usedColors = (await prisma.user.findMany({ select: { color: true } })).map(
    (u) => u.color
  );
  if (usedColors.includes(color)) {
    return { error: "That colour is already used by another family member." };
  }

  let email: string | null = null;
  let passwordHash: string | null = null;

  if (sendInvite) {
    email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    if (!email) {
      return { error: "Please enter an email address, or turn off \"Send invite\"." };
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { error: "A family member with that email already exists." };
    }

    const requiresPassword = formData.get("requiresPassword") === "on";
    if (requiresPassword) {
      const password = String(formData.get("password") ?? "");
      if (password.length < 8) {
        return { error: "Password must be at least 8 characters." };
      }
      passwordHash = await hashPassword(password);
    }
  }

  await prisma.user.create({
    data: { name, email, passwordHash, role, color },
  });

  revalidatePath("/admin");
  revalidatePath("/week");
  return undefined;
}

export async function updateMemberAccess(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const requiresPassword = formData.get("requiresPassword") === "on";
  const password = String(formData.get("password") ?? "");

  if (!userId || !email) {
    return { error: "Please enter an email address." };
  }

  const existing = await prisma.user.findFirst({
    where: { email, NOT: { id: userId } },
  });
  if (existing) {
    return { error: "That email is already used by another family member." };
  }

  let passwordHash: string | null = null;
  if (requiresPassword) {
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters." };
    }
    passwordHash = await hashPassword(password);
  }

  await prisma.user.update({ where: { id: userId }, data: { email, passwordHash } });

  revalidatePath("/admin");
  return undefined;
}

const MAX_PHOTO_DATA_URL_LENGTH = 2_000_000; // ~1.5MB decoded — resized client-side well under this

export async function updateMemberPhoto(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  if (!userId) {
    return { error: "Missing family member." };
  }

  const photoDataUrl = String(formData.get("photoDataUrl") ?? "").trim();
  const removePhoto = formData.get("removePhoto") === "1";

  if (removePhoto) {
    await prisma.user.update({ where: { id: userId }, data: { photoUrl: null } });
    revalidatePath("/admin");
    revalidatePath("/week");
    return undefined;
  }

  if (!photoDataUrl) {
    return { error: "Please choose a photo." };
  }
  if (!photoDataUrl.startsWith("data:image/")) {
    return { error: "That doesn't look like a photo." };
  }
  if (photoDataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
    return { error: "That photo is too large — try a different one." };
  }

  await prisma.user.update({ where: { id: userId }, data: { photoUrl: photoDataUrl } });

  revalidatePath("/admin");
  revalidatePath("/week");
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

// One-time cleanup for events added before eventGroupId existed (it shipped
// after batchId — anything imported or multi-added before that only has
// batchId, which groups a whole import/submission together rather than just
// one event's siblings, so it can't drive "edit/delete for everyone"). This
// reconstructs eventGroupId for those older rows by grouping same-batch rows
// that share a title/time/reminder-flag — the same identity the importer
// itself now uses to decide what counts as "one event" expanded across
// people and dates. Safe to run more than once — already-grouped rows are
// left alone.
export async function backfillEventGroups(): Promise<{ fixed: number }> {
  await requireAdmin();

  const orphans = await prisma.event.findMany({
    where: { eventGroupId: null, batchId: { not: null } },
    select: {
      id: true,
      batchId: true,
      title: true,
      startTime: true,
      endTime: true,
      isReminder: true,
    },
  });

  const groups = new Map<string, string[]>();
  for (const e of orphans) {
    const key = `${e.batchId}::${e.title}::${e.startTime}::${e.endTime ?? ""}::${e.isReminder}`;
    const ids = groups.get(key) ?? [];
    ids.push(e.id);
    groups.set(key, ids);
  }

  let fixed = 0;
  for (const ids of groups.values()) {
    if (ids.length < 2) continue;
    await prisma.event.updateMany({
      where: { id: { in: ids } },
      data: { eventGroupId: randomUUID() },
    });
    fixed += ids.length;
  }

  revalidatePath("/week");
  return { fixed };
}
