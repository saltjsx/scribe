interface AppBootScreenProps {
  title: string;
  detail?: string;
}

export function AppBootScreen({ title, detail }: AppBootScreenProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6 text-center">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--divider)] bg-[var(--surface)] px-6 py-8 shadow-sm">
        <h1 className="font-[var(--font-playfair)] text-3xl text-[var(--foreground)]">
          {title}
        </h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {detail ?? "Loading your local workspace."}
        </p>
      </div>
    </main>
  );
}
