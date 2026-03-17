"use client";

import { useMemo, useState } from "react";
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

export default function EntriesPageClient() {
  const pathname = usePathname();
  const { entries, isHydrated } = useEntries();
  const haptic = useWebHaptics();
  const [query, setQuery] = useState("");

  const filteredEntries = useMemo(() => {
    if (!query.trim()) return entries;
    const loweredQuery = query.toLowerCase();
    return entries.filter(
      (entry) =>
        entry.date.toLowerCase().includes(loweredQuery) ||
        entry.dateShort.toLowerCase().includes(loweredQuery) ||
        entry.body.toLowerCase().includes(loweredQuery) ||
        moodLabel(entry.mood).toLowerCase().includes(loweredQuery)
    );
  }, [entries, query]);

  if (!isHydrated) {
    return (
      <div className="flex flex-col px-4 py-6">
        <div className="mb-4 skeleton h-[28px] w-[100px]" />
        <div className="mb-4 skeleton h-[36px] w-full rounded-lg" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-[56px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 py-6 pb-28">
      <h1 className="mb-4 text-[24px] font-semibold tracking-[-0.01em] text-[var(--foreground)]">
        Entries
      </h1>

      <div className="mb-4">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--subtle)] px-3 py-2.5">
          <MagnifyingGlass size={16} weight="regular" className="shrink-0 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Search entries..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="flex-1 bg-transparent text-[14px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
          />
          {query && (
            <button
              onClick={() => {
                haptic.trigger("light");
                setQuery("");
              }}
              className="text-[var(--muted)] active:text-[var(--foreground)]"
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {query && (
        <p className="mb-2 px-1 text-[12px] text-[var(--muted)]">
          {filteredEntries.length} result{filteredEntries.length !== 1 ? "s" : ""}
        </p>
      )}

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
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] leading-[20px] font-medium">
                  {entry.dateShort}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5">
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
