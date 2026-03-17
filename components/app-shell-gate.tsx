"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { AppBootScreen } from "@/components/app-boot-screen";
import { getLastActiveUserId } from "@/lib/sync/local-store";

export default function AppShellGate({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isLoaded, userId } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const localUserId = useSyncExternalStore(
    () => () => {},
    getLastActiveUserId,
    () => null
  );
  const hasCheckedLocalUser = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const hasLocalAccess = Boolean(userId || localUserId);
  const isOffline = hasCheckedLocalUser && typeof navigator !== "undefined" && !navigator.onLine;

  useEffect(() => {
    if (!hasCheckedLocalUser || !isLoaded || hasLocalAccess || isOffline) {
      return;
    }

    const redirectUrl = pathname || "/app";
    router.replace(`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`);
  }, [hasCheckedLocalUser, hasLocalAccess, isLoaded, isOffline, pathname, router]);

  if (!hasCheckedLocalUser || !isLoaded) {
    return <>{children}</>;
  }

  if (!hasLocalAccess) {
    if (!isOffline) {
      return null;
    }

    return (
      <AppBootScreen
        title="Offline Setup Needed"
        detail="This device needs one online sign-in before it can open offline."
      />
    );
  }

  return <>{children}</>;
}
