"use client";

import { useSyncExternalStore } from "react";
import AppLayoutClient from "@/components/app-layout-client";
import { AppBootScreen } from "@/components/app-boot-screen";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!hasMounted) {
    return (
      <AppBootScreen
        title="Opening Scribe"
        detail="Loading your local workspace."
      />
    );
  }

  return <AppLayoutClient>{children}</AppLayoutClient>;
}
