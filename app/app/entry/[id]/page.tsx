"use client";

import { useParams } from "next/navigation";
import { useEntries } from "@/lib/entries-context";
import EntryView from "@/components/entry-view";

export default function EntryPage() {
  const { id } = useParams<{ id: string }>();
  const { entries, isHydrated } = useEntries();
  const entry = entries.find((e) => e.id === id);

  if (!isHydrated) {
    return (
      <div className="flex flex-col px-4 md:px-8 py-6 md:py-8 max-w-[720px] mx-auto">
        <div className="skeleton h-[28px] w-[200px] mb-6" />
        <div className="skeleton h-[20px] w-[120px] mb-4" />
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
      <div className="flex flex-col items-center justify-center h-full text-[var(--muted)] text-[14px]">
        Entry not found
      </div>
    );
  }

  return <EntryView entry={entry} />;
}
