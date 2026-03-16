import { ensureSyncSchema } from "@/lib/server/sync-schema";

async function main() {
  process.stdout.write("Pushing sync schema to Neon...\n");
  await ensureSyncSchema();
  process.stdout.write("Sync schema is up to date.\n");
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
