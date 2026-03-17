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

  if (!hasCheckedLocalUser || (!hasLocalAccess && !isLoaded)) {
    return (
      <AppBootScreen
        title="Opening Scribe"
        detail="Starting the local-first workspace."
      />
    );
  }

  if (!hasLocalAccess) {
    return (
      <AppBootScreen
        title={isOffline ? "Offline Setup Needed" : "Redirecting"}
        detail={
          isOffline
            ? "This device needs one online sign-in before it can open offline."
            : "Taking you to sign in so sync can reconnect."
        }
      />
    );
  }

  return <>{children}</>;
}
