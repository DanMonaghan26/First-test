import Image from "next/image";
import Link from "next/link";
import { logout } from "@/lib/actions/auth-actions";
import { SearchBox } from "@/components/SearchBox";
import { BurgerMenu } from "@/components/BurgerMenu";

export function NavBar({
  name,
  role,
  undo,
  displayMode,
}: {
  name: string;
  role: "ADMIN" | "MEMBER";
  undo: { title: string; count: number } | null;
  displayMode: boolean;
}) {
  const links = [
    { href: "/subscriptions", label: "Subscriptions" },
    { href: "/import", label: "Import from text" },
    ...(role === "ADMIN" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-black/90">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/week"
          prefetch={false}
          className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          <Image
            src="/monaghan-family.jpg"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
          />
          Monaghan Family Planner
        </Link>
        <div className="flex items-center gap-3">
          {!displayMode && (
            <>
              <SearchBox />
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
            </>
          )}
          <BurgerMenu links={links} undo={undo} displayMode={displayMode} />
        </div>
      </div>
    </header>
  );
}
