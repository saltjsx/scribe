import { AppBootScreen } from "@/components/app-boot-screen";
import ClientOnly from "@/components/client-only";
import EntryPageClient from "@/components/routes/entry-page-client";

export default function EntryPage() {
  return (
    <ClientOnly
      fallback={
        <AppBootScreen
          title="Opening Scribe"
          detail="Loading this entry."
        />
      }
    >
      <EntryPageClient />
    </ClientOnly>
  );
}
