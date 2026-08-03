"use client";

import { deleteDisplayLink } from "@/app/(dashboard)/admin/actions";

export function DeleteDisplayLinkButton({ id }: { id: string }) {
  return (
    <form
      action={deleteDisplayLink}
      onSubmit={(e) => {
        if (!confirm("Remove this TV display link? The TV will stop showing the planner until you open a new link on it.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-sm font-medium text-red-600 hover:underline dark:text-red-400"
      >
        Remove
      </button>
    </form>
  );
}
