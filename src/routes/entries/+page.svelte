<script lang="ts">
	import { MagnifyingGlass, BookOpenText, XCircle } from 'phosphor-svelte';
	import { getMoodLabel, getMoodDotColor } from '$lib/entries';
	import { triggerHaptic } from '$lib/haptics';
	import { journalEntries, journalLoaded } from '$lib/journal';

	let searchQuery = $state('');
	let searchInput = $state<HTMLInputElement | null>(null);

	function stripHtml(html: string): string {
		return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
	}

	const filteredEntries = $derived(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return $journalEntries;
		return $journalEntries.filter(
			(e) =>
				e.dateShort.toLowerCase().includes(q) ||
				e.date.toLowerCase().includes(q) ||
				getMoodLabel(e.mood).toLowerCase().includes(q) ||
				stripHtml(e.body).toLowerCase().includes(q)
		);
	});

</script>

<div class="entries-page">
	<header class="entries-header">
		<h1 class="entries-title">Entries</h1>
		<span class="entries-count">{$journalEntries.length}</span>
	</header>

	<!-- Search -->
	<div class="search-bar">
		<MagnifyingGlass size={18} weight="regular" class="search-icon" />
		<input
			type="text"
			placeholder="Search entries..."
			bind:value={searchQuery}
			bind:this={searchInput}
			class="search-input"
		/>
		{#if searchQuery}
			<button
				class="search-clear"
				onclick={() => {
					triggerHaptic('light');
					searchQuery = '';
					searchInput?.focus();
				}}
				aria-label="Clear search"
			>
				<XCircle size={18} weight="fill" />
			</button>
		{/if}
	</div>

	<!-- Entry list -->
	<div class="entry-list">
		{#if filteredEntries().length > 0}
			{#each filteredEntries() as entry (entry.id)}
				<a href="/entry/{entry.id}" class="entry-card" onclick={() => triggerHaptic('selection')}>
					<div class="entry-card-left">
						<span class="entry-card-icon">
							<BookOpenText size={22} weight="regular" />
						</span>
					</div>
					<div class="entry-card-content">
						<span class="entry-card-date">{entry.dateShort}</span>
						<div class="entry-card-mood">
							<span
								class="mood-dot"
								style="background-color: {getMoodDotColor(entry.mood)}"
							></span>
							<span class="mood-text">
								{getMoodLabel(entry.mood)} &middot; {entry.mood}/10
							</span>
						</div>
					</div>
				</a>
			{/each}
		{:else if $journalLoaded}
			<div class="entries-empty">
				<p>{searchQuery ? 'No matching entries.' : 'No journal entries yet.'}</p>
				{#if !searchQuery}
					<a href="/new" class="entries-empty-cta" onclick={() => triggerHaptic('medium')}>Write your first entry</a>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.entries-page {
		padding: 20px 20px 100px;
		max-width: 720px;
		margin: 0 auto;
	}

	.entries-header {
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin-bottom: 20px;
		padding-top: env(safe-area-inset-top, 0px);
	}

	.entries-title {
		font-family: 'Instrument Serif', 'Georgia', serif;
		font-size: 34px;
		font-weight: 400;
		color: var(--foreground);
		letter-spacing: -0.3px;
		line-height: 1;
	}

	.entries-count {
		font-size: 17px;
		font-weight: 500;
		color: var(--muted);
	}

	/* Search */
	.search-bar {
		position: relative;
		margin-bottom: 16px;
	}

	.search-bar :global(.search-icon) {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--muted);
		pointer-events: none;
		z-index: 1;
	}

	.search-input {
		width: 100%;
		height: 40px;
		padding: 0 40px 0 38px;
		border-radius: 12px;
		border: 0.5px solid var(--divider);
		background: var(--search-bg);
		color: var(--foreground);
		font-size: 16px;
		font-family: inherit;
		outline: none;
		-webkit-appearance: none;
		transition:
			background-color 0.2s,
			border-color 0.2s,
			box-shadow 0.2s;
	}

	.search-input::placeholder {
		color: var(--muted);
	}

	.search-input:focus {
		background: var(--search-bg-focus);
		border-color: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
	}

	.search-clear {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		padding: 4px;
		border: none;
		background: transparent;
		color: var(--muted);
		cursor: default;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
	}

	/* Entry cards */
	.entry-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.entry-card {
		display: flex;
		gap: 14px;
		padding: 14px 4px;
		border-bottom: 0.5px solid var(--divider);
		text-decoration: none;
		color: inherit;
		-webkit-tap-highlight-color: transparent;
		transition: background-color 0.1s;
		border-radius: 0;
	}

	.entry-card:active {
		background: var(--hover-bg);
	}

	.entry-card:last-child {
		border-bottom: none;
	}

	.entry-card-left {
		flex-shrink: 0;
		padding-top: 2px;
	}

	.entry-card-icon {
		color: var(--muted);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.entry-card-content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.entry-card-date {
		font-size: 16px;
		font-weight: 600;
		color: var(--foreground);
		line-height: 1.25;
	}

	.entry-card-mood {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 2px;
	}

	.mood-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.mood-text {
		font-size: 13px;
		color: var(--muted);
		line-height: 1.3;
	}

	/* Empty state */
	.entries-empty {
		text-align: center;
		padding: 48px 20px;
	}

	.entries-empty p {
		font-size: 16px;
		color: var(--muted);
		margin-bottom: 16px;
	}

	.entries-empty-cta {
		display: inline-flex;
		align-items: center;
		padding: 12px 28px;
		border-radius: 100px;
		background: var(--accent);
		color: #ffffff;
		font-size: 16px;
		font-weight: 600;
		text-decoration: none;
		-webkit-tap-highlight-color: transparent;
	}

	.entries-empty-cta:active {
		filter: brightness(0.92);
	}

	/* Desktop: wider padding */
	@media (min-width: 769px) {
		.entries-page {
			padding: 40px 48px;
		}

		.entries-title {
			font-size: 42px;
		}
	}
</style>
