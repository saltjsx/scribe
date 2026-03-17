"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppBootScreen } from "@/components/app-boot-screen";

export default function HomeRedirectClient() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/app");
  }, [router]);

  return (
    <AppBootScreen
      title="Opening Scribe"
      detail="Loading your local journal."
    />
  );
}
