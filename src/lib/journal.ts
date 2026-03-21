import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';
import type { Entry } from '$lib/entries';
import { formatEntryDates, sortEntriesByDate } from '$lib/entries';
import type {
	RemoteEntryRecord,
	SyncPullResponse,
	SyncPushChange,
	SyncPushResponse
} from '$lib/sync/protocol';

const DB_NAME = 'scribe-journal';
const ENTRIES_STORE = 'entries';
const META_STORE = 'meta';
const DB_VERSION = 2;

type SyncPhase = 'idle' | 'loading' | 'syncing' | 'synced' | 'offline' | 'error';

interface StoredEntryRecord {
	key: string;
	userId: string;
	id: string;
	createdAt: string;
	updatedAt: string;
	mood: number;
	body: string;
	deleted: boolean;
	pendingSync: boolean;
	lastSyncedAt: string | null;
	lastSyncError: string | null;
}

interface MetaRecord {
	key: string;
	value: string;
}

interface SyncStatus {
	phase: SyncPhase;
	pendingCount: number;
	lastSyncedAt: string | null;
	error: string | null;
}

export const journalEntries = writable<Entry[]>([]);
export const journalLoaded = writable(false);
export const syncStatus = writable<SyncStatus>({
	phase: 'idle',
	pendingCount: 0,
	lastSyncedAt: null,
	error: null
});

let dbPromise: Promise<IDBDatabase> | null = null;
let currentUserId: string | null = null;
let loadPromise: Promise<Entry[]> | null = null;
let syncPromise: Promise<void> | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let onlineListenerBound = false;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
	});
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
	return new Promise((resolve, reject) => {
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
		transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
	});
}

function createEntryId(date: Date): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return `${date.toISOString().slice(0, 10)}-${crypto.randomUUID().slice(0, 8)}`;
	}

	return `${date.toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

function entryKey(userId: string, id: string): string {
	return `${userId}:${id}`;
}

function syncCursorKey(userId: string): string {
	return `sync-cursor:${userId}`;
}

function withDisplayDates(entry: Omit<Entry, 'date' | 'dateShort'>): Entry {
	return {
		...entry,
		...formatEntryDates(new Date(entry.createdAt))
	};
}

function toEntry(record: StoredEntryRecord): Entry {
	return withDisplayDates({
		id: record.id,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		mood: record.mood,
		body: record.body
	});
}

function toStoredRecord(userId: string, remote: RemoteEntryRecord): StoredEntryRecord {
	return {
		key: entryKey(userId, remote.id),
		userId,
		id: remote.id,
		createdAt: remote.createdAt,
		updatedAt: remote.updatedAt,
		mood: remote.mood,
		body: remote.body,
		deleted: remote.deletedAt !== null,
		pendingSync: false,
		lastSyncedAt: new Date().toISOString(),
		lastSyncError: null
	};
}

async function openDatabase(): Promise<IDBDatabase> {
	if (!browser) {
		throw new Error('IndexedDB is only available in the browser');
	}

	if (dbPromise) return dbPromise;

	dbPromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;

			if (db.objectStoreNames.contains('entries')) {
				db.deleteObjectStore('entries');
			}

			const entryStore = db.createObjectStore(ENTRIES_STORE, { keyPath: 'key' });
			entryStore.createIndex('userId', 'userId', { unique: false });
			entryStore.createIndex('userId_pendingSync', ['userId', 'pendingSync'], { unique: false });

			if (!db.objectStoreNames.contains(META_STORE)) {
				db.createObjectStore(META_STORE, { keyPath: 'key' });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('Failed to open journal database'));
	});

	return dbPromise;
}

async function getEntriesForUser(userId: string): Promise<StoredEntryRecord[]> {
	const db = await openDatabase();
	const transaction = db.transaction(ENTRIES_STORE, 'readonly');
	const index = transaction.objectStore(ENTRIES_STORE).index('userId');
	const records = (await requestToPromise(index.getAll(userId))) as StoredEntryRecord[];
	return records;
}

async function getEntryRecord(userId: string, id: string): Promise<StoredEntryRecord | undefined> {
	const db = await openDatabase();
	const transaction = db.transaction(ENTRIES_STORE, 'readonly');
	const record = (await requestToPromise(
		transaction.objectStore(ENTRIES_STORE).get(entryKey(userId, id))
	)) as StoredEntryRecord | undefined;
	return record;
}

async function putEntryRecords(records: StoredEntryRecord[]): Promise<void> {
	if (records.length === 0) return;

	const db = await openDatabase();
	const transaction = db.transaction(ENTRIES_STORE, 'readwrite');
	const store = transaction.objectStore(ENTRIES_STORE);

	for (const record of records) {
		store.put(record);
	}

	await transactionDone(transaction);
}

async function putMetaRecord(record: MetaRecord): Promise<void> {
	const db = await openDatabase();
	const transaction = db.transaction(META_STORE, 'readwrite');
	transaction.objectStore(META_STORE).put(record);
	await transactionDone(transaction);
}

async function getMetaValue(key: string): Promise<string | null> {
	const db = await openDatabase();
	const transaction = db.transaction(META_STORE, 'readonly');
	const record = (await requestToPromise(transaction.objectStore(META_STORE).get(key))) as
		| MetaRecord
		| undefined;
	return record?.value ?? null;
}

async function getPendingRecords(userId: string): Promise<StoredEntryRecord[]> {
	const records = await getEntriesForUser(userId);
	return records.filter((record) => record.pendingSync);
}

async function publishUserEntries(userId: string): Promise<Entry[]> {
	const records = await getEntriesForUser(userId);
	const entries = sortEntriesByDate(records.filter((record) => !record.deleted).map(toEntry));
	journalEntries.set(entries);
	return entries;
}

async function refreshSyncStatus(userId: string, overrides: Partial<SyncStatus> = {}): Promise<void> {
	const records = await getEntriesForUser(userId);
	const pendingCount = records.filter((record) => record.pendingSync).length;
	const lastSyncedAt =
		records
			.filter((record) => record.lastSyncedAt)
			.map((record) => record.lastSyncedAt as string)
			.sort()
			.at(-1) ?? null;

	syncStatus.update((current) => ({
		phase: current.phase,
		pendingCount,
		lastSyncedAt,
		error: current.error,
		...overrides
	}));
}

function scheduleSync(delayMs = 0): void {
	if (!browser || !currentUserId) return;

	if (syncTimer) {
		clearTimeout(syncTimer);
	}

	syncTimer = setTimeout(() => {
		syncTimer = null;
		void runSyncCycle();
	}, delayMs);
}

function bindOnlineListener(): void {
	if (!browser || onlineListenerBound) return;

	window.addEventListener('online', () => {
		syncStatus.update((current) => ({
			...current,
			phase: current.pendingCount > 0 ? 'syncing' : 'idle',
			error: null
		}));
		scheduleSync(0);
	});

	window.addEventListener('offline', () => {
		syncStatus.update((current) => ({
			...current,
			phase: 'offline'
		}));
	});

	onlineListenerBound = true;
}

async function pushPendingChanges(userId: string): Promise<void> {
	const pendingBeforeRequest = await getPendingRecords(userId);
	if (pendingBeforeRequest.length === 0) return;

	const changes: SyncPushChange[] = pendingBeforeRequest.map((record) => ({
		id: record.id,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		body: record.body,
		mood: record.mood,
		deleted: record.deleted
	}));

	const response = await fetch('/api/sync/entries', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({ changes })
	});

	if (!response.ok) {
		throw new Error(response.status === 401 ? 'Sign in to sync your journal.' : 'Push sync failed.');
	}

	const data = (await response.json()) as SyncPushResponse;
	const snapshotById = new Map(pendingBeforeRequest.map((record) => [record.id, record]));
	const writes: StoredEntryRecord[] = [];

	for (const remote of data.entries) {
		const local = await getEntryRecord(userId, remote.id);
		const sent = snapshotById.get(remote.id);

		if (local && sent && local.pendingSync && local.updatedAt !== sent.updatedAt) {
			continue;
		}

		writes.push(toStoredRecord(userId, remote));
	}

	await putEntryRecords(writes);
}

async function pullRemoteChanges(userId: string): Promise<void> {
	const cursor = await getMetaValue(syncCursorKey(userId));
	const query = cursor ? `?since=${encodeURIComponent(cursor)}` : '';
	const response = await fetch(`/api/sync/entries${query}`);

	if (!response.ok) {
		throw new Error(response.status === 401 ? 'Sign in to sync your journal.' : 'Pull sync failed.');
	}

	const data = (await response.json()) as SyncPullResponse;
	const writes: StoredEntryRecord[] = [];

	for (const remote of data.entries) {
		const local = await getEntryRecord(userId, remote.id);

		if (local && local.pendingSync && new Date(local.updatedAt).getTime() > new Date(remote.updatedAt).getTime()) {
			continue;
		}

		writes.push(toStoredRecord(userId, remote));
	}

	await putEntryRecords(writes);

	if (data.cursor) {
		await putMetaRecord({
			key: syncCursorKey(userId),
			value: data.cursor
		});
	}
}

async function runSyncCycle(): Promise<void> {
	if (!browser || !currentUserId) return;
	if (!navigator.onLine) {
		await refreshSyncStatus(currentUserId, { phase: 'offline', error: null });
		return;
	}
	if (syncPromise) return syncPromise;

	const userId = currentUserId;

	syncPromise = (async () => {
		await refreshSyncStatus(userId, { phase: 'syncing', error: null });

		try {
			await pushPendingChanges(userId);
			await pullRemoteChanges(userId);
			await publishUserEntries(userId);
			await refreshSyncStatus(userId, {
				phase: 'synced',
				error: null
			});
		} catch (error) {
			await refreshSyncStatus(userId, {
				phase: navigator.onLine ? 'error' : 'offline',
				error: error instanceof Error ? error.message : 'Sync failed.'
			});
		} finally {
			syncPromise = null;
			const pendingCount = get(syncStatus).pendingCount;
			if (pendingCount > 0 && navigator.onLine) {
				scheduleSync(1500);
			}
		}
	})();

	return syncPromise;
}

async function upsertLocalRecord(
	userId: string,
	record: Omit<StoredEntryRecord, 'key' | 'userId' | 'pendingSync' | 'lastSyncedAt' | 'lastSyncError'> & {
		pendingSync?: boolean;
		lastSyncedAt?: string | null;
		lastSyncError?: string | null;
	}
): Promise<Entry> {
	const nextRecord: StoredEntryRecord = {
		key: entryKey(userId, record.id),
		userId,
		id: record.id,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		mood: record.mood,
		body: record.body,
		deleted: record.deleted,
		pendingSync: record.pendingSync ?? true,
		lastSyncedAt: record.lastSyncedAt ?? null,
		lastSyncError: record.lastSyncError ?? null
	};

	await putEntryRecords([nextRecord]);
	await publishUserEntries(userId);
	await refreshSyncStatus(userId, {
		phase: navigator.onLine ? 'syncing' : 'offline',
		error: null
	});
	scheduleSync(200);
	return toEntry(nextRecord);
}

export async function setJournalUser(userId: string | null): Promise<void> {
	if (!browser) return;
	if (currentUserId === userId && get(journalLoaded)) return;

	currentUserId = userId;
	loadPromise = null;

	if (!userId) {
		journalEntries.set([]);
		journalLoaded.set(false);
		syncStatus.set({
			phase: 'idle',
			pendingCount: 0,
			lastSyncedAt: null,
			error: null
		});
		return;
	}

	bindOnlineListener();
	await ensureJournalLoaded();
	scheduleSync(0);
}

export async function ensureJournalLoaded(): Promise<Entry[]> {
	if (!browser || !currentUserId) {
		journalEntries.set([]);
		journalLoaded.set(false);
		return [];
	}
	if (loadPromise) return loadPromise;

	loadPromise = (async () => {
		syncStatus.update((current) => ({
			...current,
			phase: 'loading',
			error: null
		}));

		const entries = await publishUserEntries(currentUserId as string);
		journalLoaded.set(true);
		await refreshSyncStatus(currentUserId as string, {
			phase: navigator.onLine ? 'idle' : 'offline',
			error: null
		});
		return entries;
	})();

	return loadPromise;
}

export async function createJournalEntry(input: { body: string; mood: number }): Promise<Entry> {
	if (!currentUserId) {
		throw new Error('No active user session');
	}

	await ensureJournalLoaded();

	const now = new Date();
	return upsertLocalRecord(currentUserId, {
		id: createEntryId(now),
		createdAt: now.toISOString(),
		updatedAt: now.toISOString(),
		mood: input.mood,
		body: input.body,
		deleted: false
	});
}

export async function importJournalEntries(
	imports: Array<{ date: Date; mood: number; body: string }>
): Promise<Entry[]> {
	if (!currentUserId) {
		throw new Error('No active user session');
	}

	await ensureJournalLoaded();

	const written: Entry[] = [];
	const records: StoredEntryRecord[] = [];

	for (const item of imports) {
		const timestamp = item.date.toISOString();
		const id = createEntryId(item.date);
		records.push({
			key: entryKey(currentUserId, id),
			userId: currentUserId,
			id,
			createdAt: timestamp,
			updatedAt: timestamp,
			mood: item.mood,
			body: item.body,
			deleted: false,
			pendingSync: true,
			lastSyncedAt: null,
			lastSyncError: null
		});
	}

	await putEntryRecords(records);
	await publishUserEntries(currentUserId);
	await refreshSyncStatus(currentUserId, {
		phase: navigator.onLine ? 'syncing' : 'offline',
		error: null
	});
	scheduleSync(200);

	for (const record of records) {
		written.push(toEntry(record));
	}

	return sortEntriesByDate(written);
}

export async function updateJournalEntry(
	id: string,
	input: { body: string; mood: number }
): Promise<Entry | null> {
	if (!currentUserId) {
		throw new Error('No active user session');
	}

	await ensureJournalLoaded();

	const existing = await getEntryRecord(currentUserId, id);
	if (!existing || existing.deleted) return null;

	return upsertLocalRecord(currentUserId, {
		id: existing.id,
		createdAt: existing.createdAt,
		updatedAt: new Date().toISOString(),
		mood: input.mood,
		body: input.body,
		deleted: false
	});
}

export async function deleteJournalEntry(id: string): Promise<void> {
	if (!currentUserId) {
		throw new Error('No active user session');
	}

	await ensureJournalLoaded();

	const existing = await getEntryRecord(currentUserId, id);
	if (!existing) return;

	await upsertLocalRecord(currentUserId, {
		id: existing.id,
		createdAt: existing.createdAt,
		updatedAt: new Date().toISOString(),
		mood: existing.mood,
		body: '',
		deleted: true
	});
}
