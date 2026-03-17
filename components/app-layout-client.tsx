"use client";

import AppShellGate from "@/components/app-shell-gate";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import BottomNav from "@/components/bottom-nav";
import { EditorProvider } from "@/lib/editor-context";
import { EntriesProvider } from "@/lib/entries-context";

export default function AppLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShellGate>
      <EntriesProvider>
        <EditorProvider>
          <div className="flex h-screen overflow-hidden bg-background">
            <div className="hidden md:block">
              <Sidebar />
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <TopBar />
              <main className="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+56px)] md:pb-0">
                {children}
              </main>
            </div>
            <BottomNav />
          </div>
        </EditorProvider>
      </EntriesProvider>
    </AppShellGate>
  );
}
