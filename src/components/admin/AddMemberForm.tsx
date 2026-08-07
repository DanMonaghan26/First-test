"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { addMember } from "@/app/(dashboard)/admin/actions";
import { RAINBOW_COLORS, pickAvailableColor } from "@/lib/colors";

const inputClass =
  "rounded-lg border border-zinc-300 px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-900";

export function AddMemberForm({ usedColors }: { usedColors: string[] }) {
  const [state, action, pending] = useActionState(addMember, undefined);
  const [open, setOpen] = useState(false);
  const [sendInvite, setSendInvite] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(true);
  const [color, setColor] = useState(() => pickAvailableColor(usedColors));
  const wasPending = useRef(false);

  const allTaken = RAINBOW_COLORS.every((c) => usedColors.includes(c.value));

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error && !state?.warning) {
      setOpen(false);
      setSendInvite(false);
      setRequiresPassword(true);
      setColor(pickAvailableColor(usedColors));
    }
    wasPending.current = pending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
      >
        + Add family member
      </button>
    );
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Name
        </label>
        <input name="name" required className={inputClass} />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Colour
        </span>
        <div className="flex flex-wrap gap-2">
          {RAINBOW_COLORS.map((c) => {
            const taken = !allTaken && usedColors.includes(c.value);
            return (
              <label key={c.value} className="flex flex-col items-center gap-1">
                <input
                  type="radio"
                  name="color"
                  value={c.value}
                  checked={color === c.value}
                  disabled={taken}
                  onChange={() => setColor(c.value)}
                  className="sr-only"
                />
                <span
                  onClick={() => !taken && setColor(c.value)}
                  className={`relative h-8 w-8 cursor-pointer rounded-full ring-offset-2 dark:ring-offset-zinc-950 ${
                    color === c.value ? "ring-2 ring-zinc-900 dark:ring-zinc-100" : ""
                  } ${taken ? "cursor-not-allowed opacity-30" : ""}`}
                  style={{ backgroundColor: c.value }}
                  title={taken ? `${c.label} (already used)` : c.label}
                />
              </label>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          name="sendInvite"
          checked={sendInvite}
          onChange={(e) => setSendInvite(e.target.checked)}
        />
        Send invite (let them sign in now)
      </label>
      {!sendInvite && (
        <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          They&apos;ll be added without login access — useful for testing. You can
          invite them later from the member list.
        </p>
      )}

      {sendInvite && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input name="email" type="email" required className={inputClass} />
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
                Temporary password
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </div>
          )}
        </>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Role
        </label>
        <select name="role" defaultValue="MEMBER" className={inputClass}>
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin (can manage everyone)</option>
        </select>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.warning && (
        <p className="text-sm text-amber-700 dark:text-amber-400">{state.warning}</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Adding..." : "Add member"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
