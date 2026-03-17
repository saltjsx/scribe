"use client";

import { useParams } from "next/navigation";
import { useEntries } from "@/lib/entries-context";
import EntryView from "@/components/entry-view";

export default function EntryPageClient() {
  const { id } = useParams<{ id: string }>();
  const { entries, isHydrated } = useEntries();
  const entry = entries.find((item) => item.id === id);

  if (!isHydrated) {
    return (
      <div className="mx-auto flex max-w-[720px] flex-col px-4 py-6 md:px-8 md:py-8">
        <div className="mb-6 skeleton h-[28px] w-[200px]" />
        <div className="mb-4 skeleton h-[20px] w-[120px]" />
        <div className="flex flex-col gap-3">
          <div className="skeleton h-[16px] w-full" />
          <div className="skeleton h-[16px] w-[90%]" />
          <div className="skeleton h-[16px] w-[75%]" />
          <div className="skeleton h-[16px] w-[85%]" />
          <div className="skeleton h-[16px] w-[60%]" />
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-[14px] text-[var(--muted)]">
        Entry not found
      </div>
    );
  }

  return <EntryView entry={entry} />;
}
