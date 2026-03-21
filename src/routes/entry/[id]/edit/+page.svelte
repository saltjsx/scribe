<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import EntryEditor from '$lib/components/EntryEditor.svelte';
	import { deleteJournalEntry, journalEntries, updateJournalEntry } from '$lib/journal';

	const entry = $derived($journalEntries.find((item) => item.id === (page.params.id ?? '')));
	let isSaving = $state(false);

	async function saveEntry({ body, mood }: { body: string; mood: number }) {
		if (!entry) return;
		isSaving = true;
		const updated = await updateJournalEntry(entry.id, { body, mood });
		isSaving = false;
		if (updated) {
			await goto(`/entry/${updated.id}`);
		}
	}

	async function removeEntry() {
		if (!entry || !confirm('Delete this entry?')) return;
		await deleteJournalEntry(entry.id);
		await goto('/');
	}
</script>

{#if entry}
	<div class="edit-page">
		<div class="topbar">
			<div class="topbar-actions">
				<button class="topbar-btn delete" onclick={removeEntry}>Delete</button>
				<a class="topbar-btn cancel" href="/entry/{entry.id}">Cancel</a>
			</div>
		</div>

		<EntryEditor
			dateLabel={entry.date}
			initialBody={entry.body}
			initialMood={entry.mood}
			isSaving={isSaving}
			saveLabel="Update"
			onSave={saveEntry}
		/>
	</div>
{:else}
	<div class="not-found">
		<p>Entry not found.</p>
	</div>
{/if}

<style>
	.edit-page {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding: 10px 20px;
		border-bottom: 0.5px solid var(--divider);
		flex-shrink: 0;
	}

	.topbar-actions {
		display: flex;
		gap: 8px;
	}

	.topbar-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 30px;
		padding: 0 16px;
		font-size: 13px;
		font-weight: 500;
		font-family: inherit;
		cursor: default;
		border-radius: 100px;
		text-decoration: none;
		transition:
			background-color 0.15s,
			filter 0.15s,
			transform 0.1s;
	}

	.topbar-btn:active {
		transform: scale(0.96);
	}

	.topbar-btn.delete,
	.topbar-btn.cancel {
		color: var(--foreground);
		background: var(--surface);
		border: 0.5px solid var(--divider);
		box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.04);
	}

	.topbar-btn.delete:hover,
	.topbar-btn.cancel:hover {
		background: var(--hover-bg);
	}

	.not-found {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--muted);
		font-size: 15px;
	}

	@media (max-width: 768px) {
		.topbar {
			padding: 10px 16px;
			padding-top: calc(10px + env(safe-area-inset-top, 0px));
		}

		.topbar-btn {
			height: 34px;
			font-size: 14px;
			padding: 0 14px;
		}
	}
</style>
