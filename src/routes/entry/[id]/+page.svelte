<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Trash, PencilSimple, CaretLeft } from 'phosphor-svelte';
	import { getMoodLabel, getMoodColor, getMoodEmoji } from '$lib/entries';
	import { triggerHaptic } from '$lib/haptics';
	import { deleteJournalEntry, journalEntries } from '$lib/journal';

	const entry = $derived($journalEntries.find((item) => item.id === (page.params.id ?? '')));

	async function removeEntry() {
		if (!entry || !confirm('Delete this entry?')) return;
		triggerHaptic('warning');
		await deleteJournalEntry(entry.id);
		triggerHaptic('success');
		await goto('/');
	}
</script>

{#if entry}
	<div class="entry-page">
		<!-- Top bar -->
		<div class="topbar">
			<a href="/entries" class="topbar-back" aria-label="Back to entries" onclick={() => triggerHaptic('selection')}>
				<CaretLeft size={20} weight="bold" />
				<span>Entries</span>
			</a>
			<div class="topbar-actions">
				<button class="topbar-btn delete" onclick={removeEntry}>
					<Trash size={15} weight="regular" />
					<span>Delete</span>
				</button>
				<a class="topbar-btn edit" href="/entry/{entry.id}/edit" onclick={() => triggerHaptic('selection')}>
					<PencilSimple size={15} weight="regular" />
					<span>Edit</span>
				</a>
			</div>
		</div>

		<!-- Content -->
		<div class="entry-content">
			<h1 class="entry-date">{entry.date}</h1>
			<div class="entry-mood" style="color: {getMoodColor(entry.mood)}">
				<span class="mood-emoji">{getMoodEmoji(entry.mood)}</span>
				<span>{getMoodLabel(entry.mood)} &middot; {entry.mood}/10</span>
			</div>

			<div class="entry-body">
				{@html entry.body}
			</div>
		</div>
	</div>
{:else}
	<div class="not-found">
		<p>Entry not found.</p>
	</div>
{/if}

<style>
	.entry-page {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	/* Top bar */
	.topbar {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding: 10px 20px;
		border-bottom: 0.5px solid var(--divider);
		flex-shrink: 0;
	}

	.topbar-back {
		display: none;
		align-items: center;
		gap: 2px;
		color: var(--accent);
		text-decoration: none;
		font-size: 16px;
		font-weight: 500;
		margin-right: auto;
		-webkit-tap-highlight-color: transparent;
	}

	.topbar-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.topbar-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
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

	.topbar-btn.delete {
		color: var(--foreground);
		background: var(--surface);
		border: 0.5px solid var(--divider);
		box-shadow: 0 0.5px 1px rgba(0, 0, 0, 0.04);
	}

	.topbar-btn.delete:hover {
		background: var(--hover-bg);
	}

	.topbar-btn.edit {
		color: #ffffff;
		background: var(--accent);
		border: none;
		box-shadow: 0 0.5px 2px rgba(0, 0, 0, 0.12);
	}

	.topbar-btn.edit:hover {
		filter: brightness(1.08);
	}

	/* Content */
	.entry-content {
		flex: 1;
		overflow-y: auto;
		padding: 40px 48px;
		max-width: 720px;
	}

	.entry-date {
		font-family: 'Instrument Serif', 'Georgia', serif;
		font-size: 36px;
		font-weight: 400;
		color: var(--foreground);
		line-height: 1.15;
		letter-spacing: -0.3px;
		margin-bottom: 8px;
	}

	.entry-mood {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		font-weight: 500;
		margin-bottom: 32px;
	}

	.mood-emoji {
		font-size: 16px;
	}

	.entry-body {
		font-size: 15px;
		line-height: 1.7;
		color: var(--foreground);
	}

	.entry-body :global(p) {
		margin-bottom: 16px;
	}

	.entry-body :global(p:last-child) {
		margin-bottom: 0;
	}

	.entry-body :global(ul) {
		padding-left: 24px;
		margin-bottom: 16px;
		list-style-type: disc;
	}

	.entry-body :global(ol) {
		padding-left: 24px;
		margin-bottom: 16px;
		list-style-type: decimal;
	}

	.entry-body :global(li) {
		margin-bottom: 4px;
		display: list-item;
	}

	.entry-body :global(blockquote) {
		border-left: 3px solid var(--accent);
		padding-left: 16px;
		margin-left: 0;
		margin-bottom: 16px;
		color: var(--muted);
		font-style: italic;
	}

	.entry-body :global(strong) {
		font-weight: 600;
	}

	.entry-body :global(em) {
		font-style: italic;
	}

	.entry-body :global(u) {
		text-decoration: underline;
	}

	.entry-body :global(s) {
		text-decoration: line-through;
	}

	/* Not found */
	.not-found {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--muted);
		font-size: 15px;
	}

	/* Mobile */
	@media (max-width: 768px) {
		.topbar {
			padding: 10px 16px;
			padding-top: calc(10px + env(safe-area-inset-top, 0px));
		}

		.topbar-back {
			display: flex;
		}

		.entry-content {
			padding: 24px 20px;
		}

		.entry-date {
			font-size: 28px;
		}

		.entry-mood {
			margin-bottom: 24px;
		}

		.entry-body {
			font-size: 16px;
			line-height: 1.65;
		}

		.topbar-btn {
			height: 34px;
			font-size: 14px;
			padding: 0 14px;
		}
	}
</style>
