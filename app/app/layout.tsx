import { AppBootScreen } from "@/components/app-boot-screen";
import ClientOnly from "@/components/client-only";
import AppLayoutClient from "@/components/app-layout-client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnly
      fallback={
        <AppBootScreen
          title="Opening Scribe"
          detail="Loading your local workspace."
        />
      }
    >
      <AppLayoutClient>{children}</AppLayoutClient>
    </ClientOnly>
  );
}
