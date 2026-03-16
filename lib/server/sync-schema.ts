import { sql } from "@/lib/db";

let schemaPromise: Promise<void> | null = null;

async function createSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_vaults (
      user_id TEXT PRIMARY KEY,
      wrapped_key TEXT NOT NULL,
      wrap_iv TEXT NOT NULL,
      wrap_tag TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS synced_entries (
      user_id TEXT NOT NULL,
      entry_id TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      iv TEXT NOT NULL,
      aad_version INTEGER NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      deleted_at TIMESTAMPTZ NULL,
      device_id TEXT NOT NULL,
      last_mutation_id TEXT NOT NULL,
      server_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, entry_id)
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS synced_entries_user_server_updated_idx
    ON synced_entries (user_id, server_updated_at)
  `;
}

export async function ensureSyncSchema() {
  if (!schemaPromise) {
    schemaPromise = createSchema();
  }

  await schemaPromise;
}
