import { AppBootScreen } from "@/components/app-boot-screen";
import ClientOnly from "@/components/client-only";
import EntriesPageClient from "@/components/routes/entries-page-client";

export default function EntriesPage() {
  return (
    <ClientOnly
      fallback={
        <AppBootScreen
          title="Opening Scribe"
          detail="Loading your entries."
        />
      }
    >
      <EntriesPageClient />
    </ClientOnly>
  );
}
