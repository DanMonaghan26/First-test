"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Polls a cheap version endpoint frequently so the display refreshes within
// seconds of an event being added/edited/deleted or a family member
// changing, plus a slower fallback refresh as a safety net (e.g. to roll
// over to the next day, or recover if a poll is ever missed). Uses
// router.refresh() rather than a full page reload — it re-fetches the
// server-rendered data in place, so a kiosk display sitting on a kitchen
// wall doesn't flash white or lose its scroll position every time.
export function TvAutoRefresh({
  token,
  day,
  pollMs = 20_000,
  fallbackMs = 5 * 60_000,
}: {
  token?: string;
  day?: string;
  pollMs?: number;
  fallbackMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    let lastVersion: string | null = null;
    let cancelled = false;
    const versionUrl = token
      ? `/api/tv/${token}/version${day ? `?day=${day}` : ""}`
      : "/api/today-version";

    async function poll() {
      try {
        const res = await fetch(versionUrl, { cache: "no-store" });
        if (!res.ok) return;
        const { version } = (await res.json()) as { version: string };
        if (lastVersion === null) {
          lastVersion = version;
        } else if (version !== lastVersion && !cancelled) {
          lastVersion = version;
          router.refresh();
        }
      } catch {
        // Ignore transient network errors — the next poll or the fallback
        // refresh will pick things up.
      }
    }

    const pollId = setInterval(poll, pollMs);
    const fallbackId = setInterval(() => router.refresh(), fallbackMs);
    poll();

    return () => {
      cancelled = true;
      clearInterval(pollId);
      clearInterval(fallbackId);
    };
  }, [token, day, pollMs, fallbackMs, router]);

  return null;
}
