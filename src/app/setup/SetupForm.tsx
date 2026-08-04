"use client";

import { useActionState } from "react";
import { setupAdmin } from "@/lib/actions/auth-actions";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAdmin, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Your name
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="Dan"
          className="rounded-lg border border-zinc-300 px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="rounded-lg border border-zinc-300 px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="At least 8 characters"
          className="rounded-lg border border-zinc-300 px-4 py-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Creating..." : "Create admin account"}
      </button>
    </form>
  );
}
