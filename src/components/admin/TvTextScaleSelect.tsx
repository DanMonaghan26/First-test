"use client";

import { useTransition } from "react";
import { updateDisplayTokenTextScale } from "@/app/(dashboard)/admin/actions";

const OPTIONS = [100, 125, 150, 175, 200];

export function TvTextScaleSelect({ id, textScale }: { id: string; textScale: number }) {
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("textScale", e.target.value);
    startTransition(() => updateDisplayTokenTextScale(formData));
  }

  return (
    <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
      Text size
      <select
        defaultValue={textScale}
        onChange={handleChange}
        disabled={pending}
        className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        {OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}%
          </option>
        ))}
      </select>
    </label>
  );
}
