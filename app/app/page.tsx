"use client";

import Link from "next/link";
import { PenNib } from "@phosphor-icons/react";
import { useEntries } from "@/lib/entries-context";
import Logo from "@/components/logo";
import ContributionGraph from "@/components/contribution-graph";
import MoodChart from "@/components/mood-chart";

function DashboardSkeleton() {
  return (
    <div className="flex flex-col px-4 md:px-8 py-6 md:py-8 max-w-[720px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="skeleton h-[32px] w-[100px]" />
        <div className="skeleton h-[33px] w-[110px] rounded-lg" />
      </div>
      <div className="mb-6">
        <div className="skeleton h-[14px] w-[60px] mb-2" />
        <div className="skeleton w-full" style={{ aspectRatio: "624 / 82" }} />
      </div>
      <div>
        <div className="skeleton h-[14px] w-[40px] mb-2" />
        <div className="skeleton w-full h-[140px]" />
      </div>
    </div>
  );
}

export default function AppPage() {
  const { entries, isHydrated } = useEntries();

  if (!isHydrated) return <DashboardSkeleton />;

  return (
    <div className="flex flex-col px-4 md:px-8 py-6 md:py-8 max-w-[720px] mx-auto">
      {/* Header row */}
      <div className="flex items-center justify-between mb-8">
        <Logo className="!text-[32px]" />
        <Link
          href="/app/new"
          className="hidden md:flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-[7px] text-[13px] font-medium text-white shadow-sm transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
        >
          <PenNib size={14} weight="fill" />
          New Entry
        </Link>
      </div>

      {/* Activity */}
      <div className="mb-6">
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">Activity</h2>
        <ContributionGraph entries={entries} />
      </div>

      {/* Mood */}
      <div>
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">Mood</h2>
        <MoodChart entries={entries} />
      </div>
    </div>
  );
}
