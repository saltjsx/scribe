import { authPool } from '$lib/server/auth-db';
import {
	decryptJournalEntry,
	encryptJournalEntry,
	isEncryptedJournalBody
} from '$lib/server/journal-crypto';
import type { RemoteEntryRecord, SyncPushChange } from '$lib/sync/protocol';

let ensureJournalTablePromise: Promise<void> | null = null;
let migrateEncryptedEntriesPromise: Promise<void> | null = null;

function mapRow(row: {
	id: string;
	user_id: string;
	created_at: Date | string;
	updated_at: Date | string;
	body: string;
	mood: number;
	deleted_at: Date | string | null;
}): RemoteEntryRecord {
	const decrypted = isEncryptedJournalBody(row.body)
		? decryptJournalEntry(row.user_id, row.id, row.body)
		: { body: row.body, mood: row.mood };

	return {
		id: row.id,
		createdAt: new Date(row.created_at).toISOString(),
		updatedAt: new Date(row.updated_at).toISOString(),
		body: decrypted.body,
		mood: decrypted.mood,
		deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null
	};
}

async function ensureEncryptedStorage(): Promise<void> {
	if (migrateEncryptedEntriesPromise) return migrateEncryptedEntriesPromise;

	migrateEncryptedEntriesPromise = (async () => {
		const result = await authPool.query<{
			id: string;
			user_id: string;
			body: string;
			mood: number;
		}>(
			`
				select id, user_id, body, mood
				from journal_entries
				where body not like 'enc:v1:%'
			`
		);

		for (const row of result.rows) {
			const encryptedBody = encryptJournalEntry(row.user_id, row.id, {
				body: row.body,
				mood: row.mood
			});

			await authPool.query(
				`
					update journal_entries
					set body = $3, mood = 0
					where user_id = $1 and id = $2
				`,
				[row.user_id, row.id, encryptedBody]
			);
		}
	})().catch((error) => {
		migrateEncryptedEntriesPromise = null;
		throw error;
	});

	return migrateEncryptedEntriesPromise;
}

export async function ensureJournalTable(): Promise<void> {
	if (ensureJournalTablePromise) return ensureJournalTablePromise;

	ensureJournalTablePromise = authPool
		.query(`
			create table if not exists journal_entries (
				id text not null,
				user_id text not null references users(id) on delete cascade,
				created_at timestamptz not null,
				updated_at timestamptz not null,
				body text not null default '',
				mood integer not null default 5,
				deleted_at timestamptz,
				primary key (user_id, id)
			);

			create index if not exists journal_entries_user_updated_idx
			on journal_entries (user_id, updated_at);
		`)
		.then(async () => {
			await ensureEncryptedStorage();
		});

	return ensureJournalTablePromise;
}

export async function listJournalChanges(
	userId: string,
	since: string | null
): Promise<RemoteEntryRecord[]> {
	await ensureJournalTable();

	const result = since
		? await authPool.query(
				`
					select id, user_id, created_at, updated_at, body, mood, deleted_at
					from journal_entries
					where user_id = $1 and updated_at > $2::timestamptz
					order by updated_at asc, id asc
				`,
				[userId, since]
			)
		: await authPool.query(
				`
					select id, user_id, created_at, updated_at, body, mood, deleted_at
					from journal_entries
					where user_id = $1
					order by updated_at asc, id asc
				`,
				[userId]
			);

	return result.rows.map((row) => mapRow(row));
}

export async function applyJournalChanges(
	userId: string,
	changes: SyncPushChange[]
): Promise<RemoteEntryRecord[]> {
	await ensureJournalTable();

	const applied: RemoteEntryRecord[] = [];

	for (const change of changes) {
		const existingResult = await authPool.query(
			`
				select id, user_id, created_at, updated_at, body, mood, deleted_at
				from journal_entries
				where user_id = $1 and id = $2
			`,
			[userId, change.id]
		);

		const existing = existingResult.rows[0] as
			| {
					id: string;
					user_id: string;
					created_at: Date | string;
					updated_at: Date | string;
					body: string;
					mood: number;
					deleted_at: Date | string | null;
			  }
			| undefined;

		const incomingUpdatedAt = new Date(change.updatedAt).getTime();
		const existingUpdatedAt = existing ? new Date(existing.updated_at).getTime() : -Infinity;

		if (!existing) {
			const encryptedBody = encryptJournalEntry(userId, change.id, {
				body: change.deleted ? '' : change.body,
				mood: change.mood
			});

			const inserted = await authPool.query(
				`
					insert into journal_entries (
						id,
						user_id,
						created_at,
						updated_at,
						body,
						mood,
						deleted_at
					) values ($1, $2, $3::timestamptz, $4::timestamptz, $5, $6, $7::timestamptz)
						returning id, user_id, created_at, updated_at, body, mood, deleted_at
				`,
				[
					change.id,
					userId,
					change.createdAt,
					change.updatedAt,
					encryptedBody,
					0,
					change.deleted ? change.updatedAt : null
				]
			);

			applied.push(mapRow(inserted.rows[0]));
			continue;
		}

		if (incomingUpdatedAt >= existingUpdatedAt) {
			const encryptedBody = encryptJournalEntry(userId, change.id, {
				body: change.deleted ? '' : change.body,
				mood: change.mood
			});

			const updated = await authPool.query(
				`
					update journal_entries
					set
						created_at = $3::timestamptz,
						updated_at = $4::timestamptz,
						body = $5,
						mood = $6,
						deleted_at = $7::timestamptz
					where user_id = $1 and id = $2
						returning id, user_id, created_at, updated_at, body, mood, deleted_at
				`,
				[
					userId,
					change.id,
					change.createdAt,
					change.updatedAt,
					encryptedBody,
					0,
					change.deleted ? change.updatedAt : null
				]
			);

			applied.push(mapRow(updated.rows[0]));
			continue;
		}

		applied.push(mapRow(existing));
	}

	return applied;
}
