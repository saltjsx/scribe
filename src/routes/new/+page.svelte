<script lang="ts">
	import { goto } from '$app/navigation';
	import EntryEditor from '$lib/components/EntryEditor.svelte';
	import { createJournalEntry } from '$lib/journal';

	const today = new Date();
	const dateStr = today.toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	let isSaving = $state(false);

	async function saveEntry({ body, mood }: { body: string; mood: number }) {
		isSaving = true;
		const entry = await createJournalEntry({ body, mood });
		isSaving = false;
		await goto(`/entry/${entry.id}`);
	}
</script>

<EntryEditor dateLabel={dateStr} isSaving={isSaving} saveLabel="Save" onSave={saveEntry} />
