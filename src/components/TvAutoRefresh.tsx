"use client";

import { useEffect } from "react";

// Polls a cheap version endpoint frequently so the display reloads within
// seconds of an event being added/edited/deleted or a family member
// changing, plus a slower fallback reload as a safety net (e.g. to roll
// over to the next day, or recover if a poll is ever missed).
export function TvAutoRefresh({
  token,
  day,
  pollMs = 8_000,
  fallbackMs = 5 * 60_000,
}: {
  token?: string;
  day?: string;
  pollMs?: number;
  fallbackMs?: number;
}) {
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
          window.location.reload();
        }
      } catch {
        // Ignore transient network errors — the next poll or the fallback
        // reload will pick things up.
      }
    }

    const pollId = setInterval(poll, pollMs);
    const fallbackId = setInterval(() => window.location.reload(), fallbackMs);
    poll();

    return () => {
      cancelled = true;
      clearInterval(pollId);
      clearInterval(fallbackId);
    };
  }, [token, day, pollMs, fallbackMs]);

  return null;
}
