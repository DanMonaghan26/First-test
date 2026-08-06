import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getFamilyMembers, getWeekBuckets } from "@/lib/family-events";
import { getWeekStart, dateKey, shiftDay } from "@/lib/week";
import { TvAutoRefresh } from "@/components/TvAutoRefresh";
import { TvDayNav } from "@/components/TvDayNav";
import { TvDayGrid } from "@/components/TvDayGrid";

export const dynamic = "force-dynamic";

export default async function TvDisplayPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ day?: string; pinned?: string }>;
}) {
  const { token } = await params;
  const { day: dayParam, pinned } = await searchParams;

  const displayToken = await prisma.displayToken.findUnique({ where: { token } });
  if (!displayToken) {
    notFound();
  }

  const todayKey = dateKey(new Date());
  const selectedDayKey = dayParam || todayKey;
  const [members, buckets] = await Promise.all([
    getFamilyMembers(),
    getWeekBuckets(getWeekStart(selectedDayKey)),
  ]);
  const day = buckets.find((b) => b.key === selectedDayKey);
  const prevDayIso = dateKey(shiftDay(selectedDayKey, -1));
  const nextDayIso = dateKey(shiftDay(selectedDayKey, 1));

  return (
    <div className="flex min-h-screen flex-col gap-4 bg-zinc-50 p-6 dark:bg-black">
      <TvAutoRefresh token={token} day={selectedDayKey} />
      <TvDayNav
        token={token}
        selectedDayKey={selectedDayKey}
        todayKey={todayKey}
        prevDayIso={prevDayIso}
        nextDayIso={nextDayIso}
        pinned={pinned === "1"}
      />
      <h1 className="text-4xl font-semibold text-zinc-900 dark:text-zinc-50">
        {day?.label ?? "Today"}
      </h1>

      {day ? (
        <TvDayGrid day={day} members={members} textScale={displayToken.textScale} />
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No data for this day.</p>
      )}
    </div>
  );
}
