"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, BookOpen, MagnifyingGlass, PenNib, X, Sun, Moon, Monitor } from "@phosphor-icons/react";
import { UserButton, useAuth } from "@clerk/nextjs";
import { useWebHaptics } from "web-haptics/react";
import { useTheme } from "@/lib/theme-context";
import { useEntries } from "@/lib/entries-context";
import { moodLabel } from "@/lib/entries";
import { buildAllEntriesMarkdown } from "@/lib/markdown-export";
import Logo from "./logo";

function moodDot(score: number): string {
  if (score >= 9) return "bg-emerald-500";
  if (score >= 7) return "bg-sky-500";
  if (score >= 5) return "bg-amber-500";
  if (score >= 3) return "bg-orange-500";
  return "bg-red-500";
}

function SidebarEntriesSkeleton() {
  return (
    <div className="flex flex-col gap-[1px]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-[7px] rounded-[5px] px-[7px] py-[4px]">
          <div className="skeleton h-[17px] w-[17px] rounded-[3px] mt-[2px] shrink-0" />
          <div className="flex flex-col gap-[4px] min-w-0 flex-1">
            <div className="skeleton h-[14px] w-[70%]" />
            <div className="skeleton h-[11px] w-[50%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const isHome = pathname === "/app";
  const isNew = pathname === "/app/new";
  const { userId } = useAuth();
  const { entries, isHydrated } = useEntries();
  const haptic = useWebHaptics();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState("");

  const exportAllEntriesAsMarkdown = () => {
    const markdown = buildAllEntriesMarkdown(entries);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `scribe-export-${timestamp}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

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

  return (
    <aside className="sidebar-chrome flex h-screen w-[240px] shrink-0 flex-col select-none">
      {/* Logo */}
      <div className="flex items-center px-4 pt-4 pb-3">
        <Logo />
      </div>

      {/* Search */}
      <div className="mx-3 mb-3">
        <div className="flex items-center gap-1.5 rounded-md bg-[var(--subtle)] px-2 py-[5px]">
          <MagnifyingGlass size={13} weight="regular" className="text-[var(--muted)] shrink-0" />
          <input
            type="text"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[12px] text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none"
          />
          {query && (
            <button onClick={() => { haptic.trigger("light"); setQuery(""); }} className="text-[var(--muted)] hover:text-[var(--foreground)]">
              <X size={11} weight="bold" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-2">
        {/* Home */}
        {!query && (
          <Link
            href="/app"
            className={`sidebar-item flex items-center gap-[7px] rounded-[5px] px-[7px] py-[3px] text-[13px] leading-[22px] font-normal text-left ${
              isHome ? "sidebar-item-active" : ""
            }`}
          >
            <House size={17} weight={isHome ? "fill" : "regular"} className={isHome ? "text-[var(--accent)]" : "text-[var(--muted)]"} />
            <span>Home</span>
          </Link>
        )}

        {/* Section header */}
        <div className={`${query ? "" : "mt-5"} mb-[3px] flex items-center px-[7px]`}>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {query ? `Results (${filteredEntries.length})` : "Entries"}
          </span>
        </div>

        {/* New entry (if on /app/new) */}
        {isNew && !query && (
          <div className="sidebar-item sidebar-item-active flex items-start gap-[7px] rounded-[5px] px-[7px] py-[4px]">
            <PenNib size={17} weight="fill" className="mt-[2px] shrink-0 text-[var(--accent)]" />
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] leading-[18px] truncate">New Entry</span>
              <span className="text-[11px] leading-[15px] text-[var(--muted)]">Draft</span>
            </div>
          </div>
        )}

        {/* Entries */}
        {!isHydrated ? <SidebarEntriesSkeleton /> : <div className="flex flex-col gap-[1px]">
          {filteredEntries.map((entry) => {
            const entryPath = `/app/entry/${entry.id}`;
            const isActive = pathname === entryPath;
            return (
              <Link
                key={entry.id}
                href={entryPath}
                className={`sidebar-item flex items-start gap-[7px] rounded-[5px] px-[7px] py-[4px] text-left transition-colors duration-100 ${
                  isActive ? "sidebar-item-active" : ""
                }`}
              >
                <BookOpen
                  size={17}
                  weight={isActive ? "fill" : "regular"}
                  className={`mt-[2px] shrink-0 ${isActive ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] leading-[18px] truncate">{entry.dateShort}</span>
                  <span className="flex items-center gap-1">
                    <span className={`inline-block h-[6px] w-[6px] rounded-full ${moodDot(entry.mood)}`} />
                    <span className="text-[11px] leading-[15px] text-[var(--muted)]">
                      {moodLabel(entry.mood)} · {entry.mood}/10
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>}
      </nav>

      {/* Bottom */}
      <div className="shrink-0 px-3 pb-4 pt-2">
        <Link
          href="/app/new"
          className="flex w-full items-center gap-[7px] rounded-[5px] px-[7px] py-[3px] text-[13px] leading-[22px] font-normal text-[var(--accent)] transition-colors duration-100 hover:bg-[var(--sidebar-hover)] mb-2 cursor-default"
        >
          <PenNib size={17} weight="fill" />
          New Entry
        </Link>
        <div className="h-[0.5px] bg-[var(--divider)] mb-3" />
        <div className="flex items-center gap-1 px-1">
          <div className="flex-1 min-w-0">
            {userId ? (
              <UserButton
                showName
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    userButtonTrigger: "w-full !justify-start",
                    userButtonBox: "!flex-row-reverse !gap-2",
                    userButtonOuterIdentifier: "!text-[12px] !text-[var(--foreground)] !font-normal !pl-0",
                    avatarBox: "!h-[22px] !w-[22px]",
                  },
                }}
              >
                <UserButton.MenuItems>
                  <UserButton.MenuAction
                    label="Export all files as Markdown"
                    labelIcon={<span aria-hidden>⬇️</span>}
                    onClick={exportAllEntriesAsMarkdown}
                  />
                </UserButton.MenuItems>
              </UserButton>
            ) : (
              <Link
                href="/sign-in"
                className="block truncate rounded-md px-2 py-1 text-[12px] text-[var(--muted)] transition-colors hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]"
              >
                Sign in to sync
              </Link>
            )}
          </div>
          <button
            onClick={() => {
              haptic.trigger("selection");
              const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
              setTheme(next);
            }}
            className="flex items-center justify-center rounded-md h-[26px] w-[26px] text-[var(--muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)] transition-colors shrink-0"
            aria-label="Toggle theme"
            title={theme === "system" ? "Theme: System" : theme === "light" ? "Theme: Light" : "Theme: Dark"}
          >
            {theme === "light" ? <Sun size={14} /> : theme === "dark" ? <Moon size={14} /> : <Monitor size={14} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
