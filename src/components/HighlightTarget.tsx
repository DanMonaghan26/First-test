"use client";

import { useEffect } from "react";

export function HighlightTarget({ eventId }: { eventId?: string }) {
  useEffect(() => {
    if (!eventId) return;
    const el = document.getElementById(`event-${eventId}`);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-indigo-500", "ring-offset-2", "dark:ring-offset-zinc-950");
    const timeout = setTimeout(() => {
      el.classList.remove("ring-2", "ring-indigo-500", "ring-offset-2", "dark:ring-offset-zinc-950");
    }, 2500);

    return () => clearTimeout(timeout);
  }, [eventId]);

  return null;
}
