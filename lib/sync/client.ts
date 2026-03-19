"use client";

import type {
  EncryptedEntryRecord,
  Entry,
  StoredEntry,
  SyncMutation,
  SyncPullResponse,
  SyncPushResponse,
} from "@/lib/entries";
import { decryptEntryPayload, encryptEntryPayload } from "@/lib/sync/crypto";
import {
  createStorageKey,
  deleteLocalEntrySnapshot,
  deleteOutboxMutation,
  getEntryRecord,
  getUserMeta,
  listEntryRecords,
  listLocalEntrySnapshots,
  listOutboxMutations,
  putLocalEntrySnapshot,
  putEntryRecord,
  putOutboxMutation,
  setUserMeta,
} from "@/lib/sync/local-store";
import { shouldReplaceRecord } from "@/lib/sync/merge";

type CreateRecordParams = {
  userId: string;
  entry: Entry;
  storedEntry: StoredEntry;
  vaultKey: CryptoKey;
  deviceId: string;
  updatedAt: string;
  deletedAt: string | null;
  mutationId: string;
};

export interface SyncUserEntriesResult {
  entries: StoredEntry[];
  pulledCount: number;
  pushedCount: number;
  discardedCount: number;
}

async function decryptRecord(userId: string, vaultKey: CryptoKey, record: EncryptedEntryRecord): Promise<StoredEntry> {
  const entry = await decryptEntryPayload({
    vaultKey,
    userId,
    entryId: record.entryId,
    ciphertext: record.ciphertext,
    iv: record.iv,
    aadVersion: record.aadVersion,
  });

  return {
    ...entry,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
    deviceId: record.deviceId,
    lastMutationId: record.lastMutationId,
  };
}

function sortEntries(entries: StoredEntry[]) {
  return entries.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit, token?: string | null) {
  const response = await fetch(input, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? "Request failed.");
  }

  return response.json() as Promise<T>;
}

export async function bootstrapVault(token: string) {
  await fetchJson("/api/vault/bootstrap", {
    method: "POST",
    body: JSON.stringify({}),
  }, token);
}

export async function fetchVaultSession(token: string) {
  return fetchJson<{ rawKey: string }>("/api/vault/session", {
    method: "POST",
    body: JSON.stringify({}),
  }, token);
}

export async function createEncryptedRecord(params: CreateRecordParams): Promise<EncryptedEntryRecord> {
  const encryptedPayload = await encryptEntryPayload({
    vaultKey: params.vaultKey,
    userId: params.userId,
    entryId: params.entry.id,
    payload: params.entry,
  });

  return {
    storageKey: createStorageKey(params.userId, params.entry.id),
    userId: params.userId,
    entryId: params.entry.id,
    ciphertext: encryptedPayload.ciphertext,
    iv: encryptedPayload.iv,
    aadVersion: encryptedPayload.aadVersion,
    updatedAt: params.updatedAt,
    deletedAt: params.deletedAt,
    deviceId: params.deviceId,
    lastMutationId: params.mutationId,
  };
}

export async function queueLocalMutation(params: CreateRecordParams & { operation: SyncMutation["operation"] }) {
  const record = await createEncryptedRecord(params);
  const mutation: SyncMutation = {
    outboxKey: createStorageKey(params.userId, params.entry.id),
    userId: params.userId,
    entryId: params.entry.id,
    mutationId: params.mutationId,
    operation: params.operation,
    record,
    queuedAt: new Date().toISOString(),
  };

  await putEntryRecord(record);
  if (params.operation === "delete") {
    await deleteLocalEntrySnapshot(params.userId, params.entry.id);
  } else {
    await putLocalEntrySnapshot(params.userId, params.storedEntry);
  }
  await putOutboxMutation(mutation);

  return record;
}

export async function loadStoredEntries(userId: string, vaultKey: CryptoKey) {
  const records = await listEntryRecords(userId);
  const decryptedEntries = await Promise.all(records.map((record) => decryptRecord(userId, vaultKey, record)));
  return sortEntries(decryptedEntries.filter((entry) => !entry.deletedAt));
}

export async function loadLocalEntries(userId: string) {
  const records = await listLocalEntrySnapshots(userId);
  return sortEntries(records.map((record) => ({
    id: record.id,
    date: record.date,
    dateShort: record.dateShort,
    mood: record.mood,
    title: record.title,
    body: record.body,
    tags: record.tags,
    updatedAt: record.updatedAt,
    deletedAt: record.deletedAt,
    deviceId: record.deviceId,
    lastMutationId: record.lastMutationId,
  })));
}

export async function backfillLocalEntries(userId: string, vaultKey: CryptoKey) {
  const entries = await loadStoredEntries(userId, vaultKey);
  await Promise.all(entries.map((entry) => putLocalEntrySnapshot(userId, entry)));
  return entries;
}

export async function syncUserEntries(userId: string, vaultKey: CryptoKey, token: string): Promise<SyncUserEntriesResult> {
  const cursor = await getUserMeta(userId, "cursor");
  const pullResponse = await fetchJson<SyncPullResponse>("/api/sync/pull", {
    method: "POST",
    body: JSON.stringify({ cursor }),
  }, token);

  let pulledCount = 0;

  for (const remoteRecord of pullResponse.records) {
    const currentLocal = await getEntryRecord(userId, remoteRecord.entryId);
    if (shouldReplaceRecord(currentLocal, remoteRecord)) {
      await putEntryRecord(remoteRecord);
      if (remoteRecord.deletedAt) {
        await deleteLocalEntrySnapshot(userId, remoteRecord.entryId);
      } else {
        const decryptedEntry = await decryptRecord(userId, vaultKey, remoteRecord);
        await putLocalEntrySnapshot(userId, decryptedEntry);
      }
      await deleteOutboxMutation(userId, remoteRecord.entryId);
      pulledCount += 1;
    }
  }

  if (pullResponse.cursor) {
    await setUserMeta(userId, "cursor", pullResponse.cursor);
  }

  const outboxMutations = await listOutboxMutations(userId);
  if (outboxMutations.length === 0) {
    return {
      entries: await loadLocalEntries(userId),
      pulledCount,
      pushedCount: 0,
      discardedCount: 0,
    };
  }

  const pushResponse = await fetchJson<SyncPushResponse>("/api/sync/push", {
    method: "POST",
    body: JSON.stringify({ mutations: outboxMutations }),
  }, token);

  const mutationIdsToDelete = new Set([
    ...pushResponse.acceptedMutationIds,
    ...pushResponse.discardedMutationIds,
  ]);

  for (const mutation of outboxMutations) {
    if (mutationIdsToDelete.has(mutation.mutationId)) {
      await deleteOutboxMutation(userId, mutation.entryId);
    }
  }

  if (pushResponse.cursor) {
    await setUserMeta(userId, "cursor", pushResponse.cursor);
  }

  return {
    entries: await loadLocalEntries(userId),
    pulledCount,
    pushedCount: pushResponse.acceptedMutationIds.length,
    discardedCount: pushResponse.discardedMutationIds.length,
  };
}
