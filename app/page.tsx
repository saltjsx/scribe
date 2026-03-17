import { AppBootScreen } from "@/components/app-boot-screen";
import ClientOnly from "@/components/client-only";
import HomeRedirectClient from "@/components/routes/home-redirect-client";

export default function Home() {
  return (
    <ClientOnly
      fallback={
        <AppBootScreen
          title="Opening Scribe"
          detail="Loading your local journal."
        />
      }
    >
      <HomeRedirectClient />
    </ClientOnly>
  );
}
