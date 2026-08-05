"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function undoLastEventBatch(): Promise<void> {
  const user = await requireUser();

  const last = await prisma.event.findFirst({
    where: { createdById: user.id, subscriptionId: null, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, batchId: true },
  });
  if (!last) return;

  if (last.batchId) {
    await prisma.event.deleteMany({
      where: { batchId: last.batchId, createdById: user.id },
    });
  } else {
    await prisma.event.deleteMany({
      where: { id: last.id, createdById: user.id },
    });
  }

  revalidatePath("/week");
}

// Restores the current user's most recently deleted event (or whole
// deleteBatchId group, e.g. every sibling of a shared event deleted
// together) — the counterpart to undoLastEventBatch, for the delete side.
export async function restoreLastDelete(): Promise<void> {
  const user = await requireUser();

  const last = await prisma.event.findFirst({
    where: { deletedById: user.id, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    select: { deleteBatchId: true },
  });
  if (!last) return;

  await prisma.event.updateMany({
    where: { deleteBatchId: last.deleteBatchId, deletedById: user.id },
    data: { deletedAt: null, deleteBatchId: null, deletedById: null },
  });

  revalidatePath("/week");
}
