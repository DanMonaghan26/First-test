"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { searchEventsAction } from "@/lib/actions/search-actions";
import type { SearchResult } from "@/lib/family-events";

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searched, setSearched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();

    const timeout = setTimeout(async () => {
      if (!trimmed) {
        setResults([]);
        setSearched(false);
        setOpen(false);
        return;
      }
      const found = await searchEventsAction(trimmed);
      setResults(found);
      setSearched(true);
      setOpen(true);
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => searched && setOpen(true)}
        placeholder="Search events…"
        aria-label="Search events"
        className="w-32 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 sm:w-52"
      />

      {open && (
        <div className="absolute left-0 z-20 mt-1 max-h-80 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              No events found.
            </p>
          ) : (
            results.map((r) => (
              <Link
                key={r.id}
                href={`/week?week=${r.weekStartIso}&highlight=${r.id}`}
                onClick={() => setOpen(false)}
                className="flex items-start gap-2 border-b border-zinc-100 px-3 py-2 text-sm last:border-b-0 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900"
              >
                <span
                  className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: r.ownerColor }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-zinc-900 dark:text-zinc-50">
                    {r.isReminder ? "📌 " : r.recurring ? "↻ " : ""}
                    {r.title}
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {r.dateLabel} · {r.isReminder ? "Reminder" : r.startTime} · {r.ownerName}
                  </span>
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
