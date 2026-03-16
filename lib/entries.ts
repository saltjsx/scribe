export interface Entry {
  id: string;
  date: string;
  dateShort: string;
  mood: number;
  title: string;
  body: string;
  tags: string[];
}

export interface StoredEntry extends Entry {
  updatedAt: string;
  deletedAt: string | null;
  deviceId: string;
  lastMutationId: string;
}

export interface EncryptedEntryRecord {
  storageKey: string;
  userId: string;
  entryId: string;
  ciphertext: string;
  iv: string;
  aadVersion: number;
  updatedAt: string;
  deletedAt: string | null;
  deviceId: string;
  lastMutationId: string;
}

export interface SyncMutation {
  outboxKey: string;
  userId: string;
  entryId: string;
  mutationId: string;
  operation: "upsert" | "delete";
  record: EncryptedEntryRecord;
  queuedAt: string;
}

export interface SyncCursor {
  value: string | null;
}

export interface SyncPullResponse {
  records: EncryptedEntryRecord[];
  cursor: string | null;
}

export interface SyncPushResponse {
  acceptedMutationIds: string[];
  discardedMutationIds: string[];
  cursor: string | null;
}

export type SyncStatus = "loading" | "saved-local" | "syncing" | "error";

export const entries: Entry[] = [];

export function getEntry(id: string): Entry | undefined {
  return entries.find((e) => e.id === id);
}

export function createEntryId(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${Date.now()}`;
}

export function formatEntryDates(now = new Date()): Pick<Entry, "date" | "dateShort" | "title"> {
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const dateShort = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    date,
    dateShort,
    title: date,
  };
}

export function moodLabel(score: number): string {
  if (score >= 9) return "Wonderful";
  if (score >= 7) return "Good";
  if (score >= 5) return "Okay";
  if (score >= 3) return "Low";
  return "Rough";
}

export function moodColor(score: number): string {
  if (score >= 9) return "#34c759";
  if (score >= 7) return "#34c759";
  if (score >= 5) return "#d4a62a";
  if (score >= 3) return "#f06030";
  return "#ff3b30";
}
