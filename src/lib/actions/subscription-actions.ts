"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { syncCalendarSubscription } from "@/lib/ical-sync";

export type ActionState = { error?: string } | undefined;

async function resolveOwnerId(
  formData: FormData,
  currentUser: { id: string; role: string }
): Promise<string> {
  const requested = formData.get("ownerId");
  if (currentUser.role === "ADMIN" && typeof requested === "string" && requested) {
    return requested;
  }
  return currentUser.id;
}

export async function addSubscription(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const url = String(formData.get("url") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  if (!url) {
    return { error: "Please enter a calendar URL." };
  }
  if (!/^(https?|webcal):\/\//i.test(url)) {
    return { error: "That doesn't look like a valid calendar URL." };
  }

  const ownerId = await resolveOwnerId(formData, user);
  if (ownerId !== user.id && user.role !== "ADMIN") {
    return { error: "You can only add subscriptions to your own calendar." };
  }

  const subscription = await prisma.calendarSubscription.create({
    data: { url, label: label || null, ownerId },
  });

  const result = await syncCalendarSubscription(subscription.id);

  revalidatePath("/subscriptions");
  revalidatePath("/week");

  if (!result.ok) {
    return {
      error: `Subscription added, but the first sync failed: ${result.error}. It'll retry automatically.`,
    };
  }
  return undefined;
}

export async function deleteSubscription(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const subscription = await prisma.calendarSubscription.findUnique({ where: { id } });
  if (!subscription) return;
  if (subscription.ownerId !== user.id && user.role !== "ADMIN") return;

  await prisma.calendarSubscription.delete({ where: { id } });
  revalidatePath("/subscriptions");
  revalidatePath("/week");
}

export async function syncSubscriptionNow(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const subscription = await prisma.calendarSubscription.findUnique({ where: { id } });
  if (!subscription) return;
  if (subscription.ownerId !== user.id && user.role !== "ADMIN") return;

  await syncCalendarSubscription(id);
  revalidatePath("/subscriptions");
  revalidatePath("/week");
}
