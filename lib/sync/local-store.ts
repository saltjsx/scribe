"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { EncryptedEntryRecord, SyncMutation } from "@/lib/entries";
import { createRandomId } from "@/lib/sync/random";

interface MetaRecord {
  key: string;
  userId: string;
  value: string | null;
}

interface CachedVaultRecord {
  key: string;
  userId: string;
  ciphertext: string;
  iv: string;
}

interface DeviceWrapKeyRecord {
  key: string;
  userId: string;
  cryptoKey: CryptoKey;
}

interface ScribeSyncDB extends DBSchema {
  entries: {
    key: string;
    value: EncryptedEntryRecord;
    indexes: {
      "by-user": string;
    };
  };
  outbox: {
    key: string;
    value: SyncMutation;
    indexes: {
      "by-user": string;
    };
  };
  meta: {
    key: string;
    value: MetaRecord;
    indexes: {
      "by-user": string;
    };
  };
  vaultCache: {
    key: string;
    value: CachedVaultRecord;
    indexes: {
      "by-user": string;
    };
  };
  deviceKeys: {
    key: string;
    value: DeviceWrapKeyRecord;
    indexes: {
      "by-user": string;
    };
  };
}

const DATABASE_NAME = "scribe-sync";
const DATABASE_VERSION = 2;
const DEVICE_ID_KEY = "scribe-device-id";

let databasePromise: Promise<IDBPDatabase<ScribeSyncDB>> | null = null;

function getDatabase() {
  if (!databasePromise) {
    databasePromise = openDB<ScribeSyncDB>(DATABASE_NAME, DATABASE_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("entries")) {
          const entryStore = db.createObjectStore("entries", { keyPath: "storageKey" });
          entryStore.createIndex("by-user", "userId");
        }

        if (!db.objectStoreNames.contains("outbox")) {
          const outboxStore = db.createObjectStore("outbox", { keyPath: "outboxKey" });
          outboxStore.createIndex("by-user", "userId");
        }

        if (!db.objectStoreNames.contains("meta")) {
          const metaStore = db.createObjectStore("meta", { keyPath: "key" });
          metaStore.createIndex("by-user", "userId");
        }

        if (!db.objectStoreNames.contains("vaultCache")) {
          const vaultCacheStore = db.createObjectStore("vaultCache", { keyPath: "key" });
          vaultCacheStore.createIndex("by-user", "userId");
        }

        if (!db.objectStoreNames.contains("deviceKeys")) {
          const deviceKeyStore = db.createObjectStore("deviceKeys", { keyPath: "key" });
          deviceKeyStore.createIndex("by-user", "userId");
        }
      },
    });
  }

  return databasePromise;
}

export function createStorageKey(userId: string, entryId: string) {
  return `${userId}:${entryId}`;
}

export async function listEntryRecords(userId: string) {
  return (await getDatabase()).getAllFromIndex("entries", "by-user", userId);
}

export async function getEntryRecord(userId: string, entryId: string) {
  return (await getDatabase()).get("entries", createStorageKey(userId, entryId));
}

export async function putEntryRecord(record: EncryptedEntryRecord) {
  await (await getDatabase()).put("entries", record);
}

export async function listOutboxMutations(userId: string) {
  return (await getDatabase()).getAllFromIndex("outbox", "by-user", userId);
}

export async function putOutboxMutation(mutation: SyncMutation) {
  await (await getDatabase()).put("outbox", mutation);
}

export async function deleteOutboxMutation(userId: string, entryId: string) {
  await (await getDatabase()).delete("outbox", createStorageKey(userId, entryId));
}

export async function setUserMeta(userId: string, key: string, value: string | null) {
  await (await getDatabase()).put("meta", {
    key: `${userId}:${key}`,
    userId,
    value,
  });
}

export async function getUserMeta(userId: string, key: string) {
  const record = await (await getDatabase()).get("meta", `${userId}:${key}`);
  return record?.value ?? null;
}

export async function getCachedVaultRecord(userId: string) {
  return (await getDatabase()).get("vaultCache", `${userId}:vault-cache`);
}

export async function putCachedVaultRecord(record: CachedVaultRecord) {
  await (await getDatabase()).put("vaultCache", record);
}

export async function getDeviceWrapKeyRecord(userId: string) {
  return (await getDatabase()).get("deviceKeys", `${userId}:device-wrap-key`);
}

export async function putDeviceWrapKeyRecord(record: DeviceWrapKeyRecord) {
  await (await getDatabase()).put("deviceKeys", record);
}

export function getDeviceId() {
  const existingValue = globalThis.localStorage.getItem(DEVICE_ID_KEY);
  if (existingValue) {
    return existingValue;
  }

  const nextValue = createRandomId();
  globalThis.localStorage.setItem(DEVICE_ID_KEY, nextValue);
  return nextValue;
}
