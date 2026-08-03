"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { resetPassword } from "@/app/(dashboard)/admin/actions";

export function ResetPasswordButton({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await resetPassword(undefined, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
      >
        Reset password
      </button>

      {open && (
        <Modal title={`Reset password – ${userName}`} onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="userId" value={userId} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                New password
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={8}
                autoFocus
                className="rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Saving..." : "Set new password"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
