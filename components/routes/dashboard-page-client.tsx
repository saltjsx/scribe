"use client";

import Link from "next/link";
import { PenNib } from "@phosphor-icons/react";
import { useEntries } from "@/lib/entries-context";
import Logo from "@/components/logo";
import ContributionGraph from "@/components/contribution-graph";
import MoodChart from "@/components/mood-chart";

function DashboardSkeleton() {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="skeleton h-[32px] w-[100px]" />
        <div className="skeleton h-[33px] w-[110px] rounded-lg" />
      </div>
      <div className="mb-6">
        <div className="mb-2 skeleton h-[14px] w-[60px]" />
        <div className="skeleton w-full" style={{ aspectRatio: "624 / 82" }} />
      </div>
      <div>
        <div className="mb-2 skeleton h-[14px] w-[40px]" />
        <div className="skeleton h-[140px] w-full" />
      </div>
    </div>
  );
}

export default function DashboardPageClient() {
  const { entries, isHydrated } = useEntries();

  if (!isHydrated) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="mx-auto flex max-w-[720px] flex-col px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 flex items-center justify-between">
        <Logo className="!text-[32px]" />
        <Link
          href="/app/new"
          className="hidden items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-[7px] text-[13px] font-medium text-white shadow-sm transition-all duration-150 hover:brightness-110 active:scale-[0.98] md:flex"
        >
          <PenNib size={14} weight="fill" />
          New Entry
        </Link>
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">Activity</h2>
        <ContributionGraph entries={entries} />
      </div>

      <div>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--muted)]">Mood</h2>
        <MoodChart entries={entries} />
      </div>
    </div>
  );
}
