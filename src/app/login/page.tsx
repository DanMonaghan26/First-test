import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const existingUsers = await prisma.user.count();
  if (existingUsers === 0) {
    redirect("/setup");
  }

  const user = await getCurrentUser();
  if (user) {
    redirect("/week");
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Family Planner
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to see and manage your week.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
