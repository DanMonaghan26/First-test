import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getFamilyMembers } from "@/lib/family-events";
import { SubscriptionForm } from "@/components/subscriptions/SubscriptionForm";
import { RemoveSubscriptionButton } from "@/components/subscriptions/RemoveSubscriptionButton";
import { syncSubscriptionNow } from "@/lib/actions/subscription-actions";

function formatSyncedAt(date: Date | null): string {
  if (!date) return "Never synced yet";
  return `Last synced ${date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export default async function SubscriptionsPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const [subscriptions, members] = await Promise.all([
    prisma.calendarSubscription.findMany({
      where: isAdmin ? {} : { ownerId: user.id },
      orderBy: { createdAt: "asc" },
      include: { owner: { select: { id: true, name: true, color: true } } },
    }),
    getFamilyMembers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Calendar subscriptions
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Subscribe to an external calendar — like a school&apos;s .ics link — and its events
          are imported automatically and kept in sync. Syncing happens roughly once a day; use
          &quot;Sync now&quot; any time you don&apos;t want to wait.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="min-w-0">
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                {sub.label || "Untitled subscription"}
                {isAdmin && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: sub.owner.color }}
                    />
                    {sub.owner.name}
                  </span>
                )}
              </p>
              <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">{sub.url}</p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">
                {formatSyncedAt(sub.lastSyncedAt)}
                {sub.lastSyncStatus === "error" && (
                  <span className="ml-1.5 text-red-600 dark:text-red-400">
                    · Last sync failed: {sub.lastSyncError}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <form action={syncSubscriptionNow}>
                <input type="hidden" name="id" value={sub.id} />
                <button
                  type="submit"
                  className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Sync now
                </button>
              </form>
              <RemoveSubscriptionButton id={sub.id} label={sub.label || sub.url} />
            </div>
          </div>
        ))}
        {subscriptions.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No calendar subscriptions yet.
          </p>
        )}
      </div>

      <SubscriptionForm currentUserId={user.id} isAdmin={isAdmin} members={members} />
    </div>
  );
}
