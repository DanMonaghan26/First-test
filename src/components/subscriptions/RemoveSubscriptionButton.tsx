"use client";

import { deleteSubscription } from "@/lib/actions/subscription-actions";

export function RemoveSubscriptionButton({ id, label }: { id: string; label: string }) {
  return (
    <form
      action={deleteSubscription}
      onSubmit={(e) => {
        if (!confirm(`Remove "${label}"? Events imported from it will be deleted too.`)) {
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
