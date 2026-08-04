"use client";

import { removeMember } from "@/app/(dashboard)/admin/actions";

export function RemoveMemberButton({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  return (
    <form
      action={removeMember}
      onSubmit={(e) => {
        if (!confirm(`Remove ${userName} and all their events? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
      >
        Remove
      </button>
    </form>
  );
}
