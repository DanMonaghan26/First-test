import Link from "next/link";
import { logout } from "@/lib/actions/auth-actions";

export function NavBar({
  name,
  role,
}: {
  name: string;
  role: "ADMIN" | "MEMBER";
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-black/90">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/week" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Family Planner
          </Link>
          {role === "ADMIN" && (
            <Link
              href="/admin"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Admin
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-zinc-600 dark:text-zinc-400 sm:inline">
            {name}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
