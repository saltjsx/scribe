"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useWebHaptics } from "web-haptics/react";
import { useEntries } from "@/lib/entries-context";
import { moodLabel } from "@/lib/entries";

function moodDot(score: number): string {
  if (score >= 9) return "bg-emerald-500";
  if (score >= 7) return "bg-sky-500";
  if (score >= 5) return "bg-amber-500";
  if (score >= 3) return "bg-orange-500";
  return "bg-red-500";
}

export default function EntriesPage() {
  const pathname = usePathname();
  const { entries, isHydrated } = useEntries();
  const haptic = useWebHaptics();
  const [query, setQuery] = useState("");

  const filteredEntries = useMemo(() => {
    if (!query.trim()) return entries;
    const q = query.toLowerCase();
    return entries.filter(
      (e) =>
        e.date.toLowerCase().includes(q) ||
        e.dateShort.toLowerCase().includes(q) ||
        e.body.toLowerCase().includes(q) ||
        moodLabel(e.mood).toLowerCase().includes(q)
    );
  }, [entries, query]);

  if (!isHydrated) {
    return (
      <div className="flex flex-col px-4 py-6">
        <div className="skeleton h-[28px] w-[100px] mb-4" />
        <div className="skeleton h-[36px] w-full rounded-lg mb-4" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-[56px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 py-6 pb-28">
      <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-[var(--foreground)] mb-4">
        Entries
      </h1>

      {/* Search */}
      <div className="mb-4">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--subtle)] px-3 py-2.5">
          <MagnifyingGlass size={16} weight="regular" className="text-[var(--muted)] shrink-0" />
          <input
            type="text"
            placeholder="Search entries..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none"
          />
          {query && (
            <button onClick={() => { haptic.trigger("light"); setQuery(""); }} className="text-[var(--muted)] active:text-[var(--foreground)]">
              <X size={14} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {query && (
        <p className="text-[12px] text-[var(--muted)] mb-2 px-1">
          {filteredEntries.length} result{filteredEntries.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Entries list */}
      <div className="flex flex-col gap-1">
        {filteredEntries.map((entry) => {
          const entryPath = `/app/entry/${entry.id}`;
          const isActive = pathname === entryPath;
          return (
            <Link
              key={entry.id}
              href={entryPath}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
                isActive ? "bg-[var(--sidebar-active)]" : "active:bg-[var(--subtle)]"
              }`}
            >
              <BookOpen
                size={20}
                weight={isActive ? "fill" : "regular"}
                className={isActive ? "text-[var(--accent)]" : "text-[var(--muted)]"}
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[15px] leading-[20px] truncate font-medium">
                  {entry.dateShort}
                </span>
                <span className="flex items-center gap-1.5 mt-0.5">
                  <span className={`inline-block h-[7px] w-[7px] rounded-full ${moodDot(entry.mood)}`} />
                  <span className="text-[12px] leading-[16px] text-[var(--muted)]">
                    {moodLabel(entry.mood)} · {entry.mood}/10
                  </span>
                </span>
              </div>
            </Link>
          );
        })}

        {filteredEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)]">
            <p className="text-[14px]">{query ? "No entries found" : "No entries yet"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
