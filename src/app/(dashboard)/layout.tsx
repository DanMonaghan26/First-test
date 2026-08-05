import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { getLastUndoableAction } from "@/lib/family-events";
import { NavBar } from "@/components/NavBar";
import { DisplayModeView } from "@/components/DisplayModeView";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const store = await cookies();
  const displayMode = store.get("displayMode")?.value === "1";

  const lastAction = displayMode ? null : await getLastUndoableAction(user.id);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <NavBar
        name={user.name}
        role={user.role}
        undo={lastAction}
        displayMode={displayMode}
      />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {displayMode ? (
          <DisplayModeView currentUser={{ id: user.id, role: user.role }} />
        ) : (
          children
        )}
      </main>
    </div>
  );
}
