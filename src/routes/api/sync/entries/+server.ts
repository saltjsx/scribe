import { json } from '@sveltejs/kit';
import { applyJournalChanges, listJournalChanges } from '$lib/server/journal-db';
import type { SyncPushChange } from '$lib/sync/protocol';

export async function GET({ locals, url }) {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const since = url.searchParams.get('since');
	const entries = await listJournalChanges(locals.user.id, since);
	const cursor = entries.at(-1)?.updatedAt ?? since ?? null;

	return json({
		entries,
		cursor
	});
}

export async function POST({ locals, request }) {
	if (!locals.user) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const payload = (await request.json()) as { changes?: SyncPushChange[] };
	const changes = Array.isArray(payload.changes) ? payload.changes : [];

	if (changes.length === 0) {
		return json({ entries: [] });
	}

	const entries = await applyJournalChanges(locals.user.id, changes);
	return json({ entries });
}
