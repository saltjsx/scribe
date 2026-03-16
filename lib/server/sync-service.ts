import type { EncryptedEntryRecord, SyncMutation, SyncPullResponse, SyncPushResponse } from "@/lib/entries";
import { sql } from "@/lib/db";
import { shouldReplaceRecord } from "@/lib/sync/merge";
import { ensureSyncSchema } from "@/lib/server/sync-schema";
import { generateVaultKey, unwrapVaultKey, wrapVaultKey } from "@/lib/server/vault";

type UserVaultRow = {
  user_id: string;
  wrapped_key: string;
  wrap_iv: string;
  wrap_tag: string;
};

type SyncedEntryRow = {
  entry_id: string;
  ciphertext: string;
  iv: string;
  aad_version: number;
  updated_at: string | Date;
  deleted_at: string | Date | null;
  device_id: string;
  last_mutation_id: string;
  server_updated_at: string | Date;
};

function toIsoString(value: string | Date | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function toEncryptedEntryRecord(userId: string, row: SyncedEntryRow): EncryptedEntryRecord {
  return {
    storageKey: `${userId}:${row.entry_id}`,
    userId,
    entryId: row.entry_id,
    ciphertext: row.ciphertext,
    iv: row.iv,
    aadVersion: row.aad_version,
    updatedAt: new Date(row.updated_at).toISOString(),
    deletedAt: toIsoString(row.deleted_at),
    deviceId: row.device_id,
    lastMutationId: row.last_mutation_id,
  };
}

function toVersionLike(row: SyncedEntryRow) {
  return {
    updatedAt: new Date(row.updated_at).toISOString(),
    deviceId: row.device_id,
    lastMutationId: row.last_mutation_id,
  };
}

async function findVault(userId: string) {
  const rows = (await sql`
    SELECT user_id, wrapped_key, wrap_iv, wrap_tag
    FROM user_vaults
    WHERE user_id = ${userId}
    LIMIT 1
  `) as UserVaultRow[];

  return rows[0] ?? null;
}

export async function bootstrapVaultForUser(userId: string) {
  await ensureSyncSchema();

  const existingVault = await findVault(userId);
  if (existingVault) {
    return { created: false };
  }

  const rawVaultKey = generateVaultKey();
  const wrappedVaultKey = wrapVaultKey(rawVaultKey);

  await sql`
    INSERT INTO user_vaults (user_id, wrapped_key, wrap_iv, wrap_tag)
    VALUES (${userId}, ${wrappedVaultKey.ciphertext}, ${wrappedVaultKey.iv}, ${wrappedVaultKey.tag})
    ON CONFLICT (user_id) DO NOTHING
  `;

  return { created: true };
}

export async function getVaultSessionForUser(userId: string) {
  await ensureSyncSchema();
  await bootstrapVaultForUser(userId);

  const vault = await findVault(userId);
  if (!vault) {
    throw new Error("Vault bootstrap failed.");
  }

  return {
    rawKey: unwrapVaultKey({
      ciphertext: vault.wrapped_key,
      iv: vault.wrap_iv,
      tag: vault.wrap_tag,
    }),
  };
}

async function getRemoteEntry(userId: string, entryId: string) {
  const rows = (await sql`
    SELECT entry_id, ciphertext, iv, aad_version, updated_at, deleted_at, device_id, last_mutation_id, server_updated_at
    FROM synced_entries
    WHERE user_id = ${userId} AND entry_id = ${entryId}
    LIMIT 1
  `) as SyncedEntryRow[];

  return rows[0] ?? null;
}

async function getLatestCursor(userId: string) {
  const rows = (await sql`
    SELECT MAX(server_updated_at) AS cursor
    FROM synced_entries
    WHERE user_id = ${userId}
  `) as { cursor: string | Date | null }[];

  return toIsoString(rows[0]?.cursor ?? null);
}

export async function pushRemoteMutations(userId: string, mutations: SyncMutation[]): Promise<SyncPushResponse> {
  await ensureSyncSchema();

  const acceptedMutationIds: string[] = [];
  const discardedMutationIds: string[] = [];

  for (const mutation of mutations) {
    const currentRemote = await getRemoteEntry(userId, mutation.entryId);

    if (
      currentRemote &&
      !shouldReplaceRecord(toVersionLike(currentRemote), mutation.record)
    ) {
      discardedMutationIds.push(mutation.mutationId);
      continue;
    }

    await sql`
      INSERT INTO synced_entries (
        user_id,
        entry_id,
        ciphertext,
        iv,
        aad_version,
        updated_at,
        deleted_at,
        device_id,
        last_mutation_id,
        server_updated_at
      )
      VALUES (
        ${userId},
        ${mutation.record.entryId},
        ${mutation.record.ciphertext},
        ${mutation.record.iv},
        ${mutation.record.aadVersion},
        ${mutation.record.updatedAt},
        ${mutation.record.deletedAt},
        ${mutation.record.deviceId},
        ${mutation.record.lastMutationId},
        NOW()
      )
      ON CONFLICT (user_id, entry_id) DO UPDATE SET
        ciphertext = EXCLUDED.ciphertext,
        iv = EXCLUDED.iv,
        aad_version = EXCLUDED.aad_version,
        updated_at = EXCLUDED.updated_at,
        deleted_at = EXCLUDED.deleted_at,
        device_id = EXCLUDED.device_id,
        last_mutation_id = EXCLUDED.last_mutation_id,
        server_updated_at = NOW()
    `;

    acceptedMutationIds.push(mutation.mutationId);
  }

  return {
    acceptedMutationIds,
    discardedMutationIds,
    cursor: await getLatestCursor(userId),
  };
}

export async function pullRemoteChanges(userId: string, cursor: string | null): Promise<SyncPullResponse> {
  await ensureSyncSchema();

  const rows = cursor
    ? ((await sql`
        SELECT entry_id, ciphertext, iv, aad_version, updated_at, deleted_at, device_id, last_mutation_id, server_updated_at
        FROM synced_entries
        WHERE user_id = ${userId} AND server_updated_at > ${cursor}
        ORDER BY server_updated_at ASC, entry_id ASC
      `) as SyncedEntryRow[])
    : ((await sql`
        SELECT entry_id, ciphertext, iv, aad_version, updated_at, deleted_at, device_id, last_mutation_id, server_updated_at
        FROM synced_entries
        WHERE user_id = ${userId}
        ORDER BY server_updated_at ASC, entry_id ASC
      `) as SyncedEntryRow[]);

  const records = rows.map((row) => toEncryptedEntryRecord(userId, row));
  const nextCursor = rows.length > 0 ? toIsoString(rows.at(-1)?.server_updated_at ?? null) : cursor;

  return {
    records,
    cursor: nextCursor,
  };
}
