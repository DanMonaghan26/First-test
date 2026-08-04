"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function undoLastEventBatch(): Promise<void> {
  const user = await requireUser();

  const last = await prisma.event.findFirst({
    where: { createdById: user.id, subscriptionId: null },
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
