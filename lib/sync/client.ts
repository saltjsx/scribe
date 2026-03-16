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
  deleteOutboxMutation,
  getEntryRecord,
  getUserMeta,
  listEntryRecords,
  listOutboxMutations,
  putEntryRecord,
  putOutboxMutation,
  setUserMeta,
} from "@/lib/sync/local-store";
import { shouldReplaceRecord } from "@/lib/sync/merge";

type CreateRecordParams = {
  userId: string;
  entry: Entry;
  vaultKey: CryptoKey;
  deviceId: string;
  updatedAt: string;
  deletedAt: string | null;
  mutationId: string;
};

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
  await putOutboxMutation(mutation);

  return record;
}

export async function loadStoredEntries(userId: string, vaultKey: CryptoKey) {
  const records = await listEntryRecords(userId);
  const decryptedEntries = await Promise.all(records.map((record) => decryptRecord(userId, vaultKey, record)));
  return sortEntries(decryptedEntries.filter((entry) => !entry.deletedAt));
}

export async function syncUserEntries(userId: string, vaultKey: CryptoKey, token: string) {
  const cursor = await getUserMeta(userId, "cursor");
  const pullResponse = await fetchJson<SyncPullResponse>("/api/sync/pull", {
    method: "POST",
    body: JSON.stringify({ cursor }),
  }, token);

  for (const remoteRecord of pullResponse.records) {
    const currentLocal = await getEntryRecord(userId, remoteRecord.entryId);
    if (shouldReplaceRecord(currentLocal, remoteRecord)) {
      await putEntryRecord(remoteRecord);
      await deleteOutboxMutation(userId, remoteRecord.entryId);
    }
  }

  if (pullResponse.cursor) {
    await setUserMeta(userId, "cursor", pullResponse.cursor);
  }

  const outboxMutations = await listOutboxMutations(userId);
  if (outboxMutations.length === 0) {
    return loadStoredEntries(userId, vaultKey);
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

  return loadStoredEntries(userId, vaultKey);
}
