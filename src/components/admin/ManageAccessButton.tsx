"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/Modal";
import { updateMemberAccess } from "@/app/(dashboard)/admin/actions";

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900";

export function ManageAccessButton({
  userId,
  userName,
  currentEmail,
  currentlyRequiresPassword,
}: {
  userId: string;
  userName: string;
  currentEmail: string | null;
  currentlyRequiresPassword: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [warning, setWarning] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  const [requiresPassword, setRequiresPassword] = useState(currentlyRequiresPassword);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateMemberAccess(undefined, formData);
      if (result?.error) {
        setError(result.error);
        setWarning(undefined);
      } else if (result?.warning) {
        setError(undefined);
        setWarning(result.warning);
      } else {
        setError(undefined);
        setWarning(undefined);
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
        {currentEmail ? "Manage login" : "Send invite"}
      </button>

      {open && (
        <Modal
          title={currentEmail ? `Manage login – ${userName}` : `Send invite – ${userName}`}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="userId" value={userId} />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                autoFocus
                defaultValue={currentEmail ?? ""}
                className={inputClass}
              />
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                name="requiresPassword"
                checked={requiresPassword}
                onChange={(e) => setRequiresPassword(e.target.checked)}
              />
              Require a password to sign in
            </label>
            {!requiresPassword && (
              <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                They&apos;ll be able to sign in with just their email — anyone who
                knows it could access their calendar too.
              </p>
            )}

            {requiresPassword && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {currentlyRequiresPassword ? "New password" : "Password"}
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className={inputClass}
                />
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            {warning && <p className="text-sm text-amber-700 dark:text-amber-400">{warning}</p>}
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-4 py-3 text-base font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Saving..." : "Save"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
