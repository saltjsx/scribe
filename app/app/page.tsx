import { AppBootScreen } from "@/components/app-boot-screen";
import ClientOnly from "@/components/client-only";
import DashboardPageClient from "@/components/routes/dashboard-page-client";

export default function AppPage() {
  return (
    <ClientOnly
      fallback={
        <AppBootScreen
          title="Opening Scribe"
          detail="Loading your local dashboard."
        />
      }
    >
      <DashboardPageClient />
    </ClientOnly>
  );
}
