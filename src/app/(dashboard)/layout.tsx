import { requireUser } from "@/lib/auth";
import { getLastUndoableBatch } from "@/lib/family-events";
import { NavBar } from "@/components/NavBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const lastBatch = await getLastUndoableBatch(user.id);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <NavBar
        name={user.name}
        role={user.role}
        undo={lastBatch ? { title: lastBatch.title, count: lastBatch.count } : null}
      />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
