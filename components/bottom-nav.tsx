"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, BookOpenText, PenNib } from "@phosphor-icons/react";
import { useWebHaptics } from "web-haptics/react";

export default function BottomNav() {
  const pathname = usePathname();
  const haptic = useWebHaptics();
  const isHome = pathname === "/app";
  const isEntries = pathname === "/app/entries" || pathname.startsWith("/app/entry/");
  const isNew = pathname === "/app/new";

  return (
    <>
      {/* Floating New Entry Button — hidden when already creating */}
      {!isNew && (
        <Link
          href="/app/new"
          onClick={() => haptic.trigger("medium")}
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+68px)] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg active:scale-95 transition-transform duration-100 md:hidden"
          aria-label="New Entry"
        >
          <PenNib size={24} weight="fill" />
        </Link>
      )}

      {/* Bottom Navigation Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden border-t border-[var(--divider)] bg-[var(--sidebar-bg)] backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <Link
          href="/app"
          onClick={() => haptic.trigger("selection")}
          className={`flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 transition-colors ${
            isHome ? "text-[var(--accent)]" : "text-[var(--muted)]"
          }`}
        >
          <House size={22} weight={isHome ? "fill" : "regular"} />
          <span className="text-[10px] font-medium">Home</span>
        </Link>
        <Link
          href="/app/entries"
          onClick={() => haptic.trigger("selection")}
          className={`flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 transition-colors ${
            isEntries ? "text-[var(--accent)]" : "text-[var(--muted)]"
          }`}
        >
          <BookOpenText size={22} weight={isEntries ? "fill" : "regular"} />
          <span className="text-[10px] font-medium">Entries</span>
        </Link>
      </nav>
    </>
  );
}
