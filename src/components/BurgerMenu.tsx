"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { undoLastEventBatch } from "@/lib/actions/undo-actions";

type NavLink = { href: string; label: string };
type Undo = { title: string; count: number } | null;

export function BurgerMenu({ links, undo }: { links: NavLink[]; undo: Undo }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const undoLabel = undo
    ? undo.count > 1
      ? `"${undo.title}" and ${undo.count - 1} other calendar ${undo.count === 2 ? "entry" : "entries"}`
      : `"${undo.title}"`
    : "";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="1" y1="4" x2="17" y2="4" strokeLinecap="round" />
          <line x1="1" y1="9" x2="17" y2="9" strokeLinecap="round" />
          <line x1="1" y1="14" x2="17" y2="14" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-60 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              prefetch={false}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              {l.label}
            </Link>
          ))}

          {undo && (
            <>
              <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
              <div className="px-4 py-2">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Last added: {undoLabel}</p>
                <form
                  action={undoLastEventBatch}
                  onSubmit={(e) => {
                    if (!confirm(`Undo adding ${undoLabel}? This can't be undone.`)) {
                      e.preventDefault();
                    } else {
                      setOpen(false);
                    }
                  }}
                >
                  <button
                    type="submit"
                    className="mt-1 text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
                  >
                    Undo
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
