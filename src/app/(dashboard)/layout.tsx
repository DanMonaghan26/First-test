import { requireUser } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <NavBar name={user.name} role={user.role} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
