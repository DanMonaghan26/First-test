import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFamilyMembers, getWeekBuckets } from "@/lib/family-events";
import { getWeekStart, dateKey } from "@/lib/week";
import { TvAutoRefresh } from "@/components/TvAutoRefresh";
import { DayTimeGrid } from "@/components/DayTimeGrid";

export const dynamic = "force-dynamic";

export default async function TvDisplayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const displayToken = await prisma.displayToken.findUnique({ where: { token } });
  if (!displayToken) {
    notFound();
  }

  const todayKey = dateKey(new Date());
  const [members, buckets] = await Promise.all([
    getFamilyMembers(),
    getWeekBuckets(getWeekStart(todayKey)),
  ]);
  const day = buckets.find((b) => b.key === todayKey);

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-zinc-50 p-6 dark:bg-black">
      <TvAutoRefresh />
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {day?.label ?? "Today"}
      </h1>

      {day ? (
        <DayTimeGrid
          day={day}
          members={members}
          currentUser={{ id: "", role: "MEMBER" }}
          readOnly
        />
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No data for today.</p>
      )}
    </div>
  );
}
