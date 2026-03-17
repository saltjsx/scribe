import { AppBootScreen } from "@/components/app-boot-screen";
import ClientOnly from "@/components/client-only";
import NewEntryPageClient from "@/components/routes/new-entry-page-client";

export default function NewEntryPage() {
  return (
    <ClientOnly
      fallback={
        <AppBootScreen
          title="Opening Scribe"
          detail="Preparing your editor."
        />
      }
    >
      <NewEntryPageClient />
    </ClientOnly>
  );
}
