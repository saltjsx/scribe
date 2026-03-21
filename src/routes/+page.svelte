<script lang="ts">
	import { PenNib } from 'phosphor-svelte';
	import ContributionGraph from '$lib/components/ContributionGraph.svelte';
	import MoodGraph from '$lib/components/MoodGraph.svelte';
	import { journalEntries, journalLoaded } from '$lib/journal';
</script>

<div class="home">
	<!-- Header -->
	<header class="home-header">
		<h1 class="home-title">Scribe</h1>
		<a href="/new" class="new-entry-pill">
			<PenNib size={18} weight="fill" />
			<span>New Entry</span>
		</a>
	</header>

	<!-- Activity section -->
	<section class="section">
		<h2 class="section-label">ACTIVITY</h2>
		{#if $journalLoaded && $journalEntries.length === 0}
			<p class="empty-copy">Write your first entry to start building your activity map.</p>
		{:else}
			<ContributionGraph />
		{/if}
	</section>

	<!-- Mood section -->
	<section class="section">
		<h2 class="section-label">MOOD</h2>
		{#if $journalLoaded && $journalEntries.length === 0}
			<p class="empty-copy">Mood trends will appear after you save a few entries.</p>
		{:else}
			<MoodGraph />
		{/if}
	</section>
</div>

<style>
	.home {
		max-width: 880px;
		margin: 0 auto;
		padding: 40px 48px;
	}

	/* Header */
	.home-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 40px;
	}

	.home-title {
		font-family: 'Instrument Serif', 'Georgia', serif;
		font-size: 42px;
		font-weight: 400;
		color: var(--foreground);
		letter-spacing: -0.5px;
		line-height: 1;
	}

	.new-entry-pill {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 24px;
		border-radius: 12px;
		text-decoration: none;
		border: none;
		background: var(--accent);
		color: #ffffff;
		font-size: 16px;
		font-weight: 600;
		font-family: inherit;
		cursor: default;
		transition:
			filter 0.15s,
			transform 0.1s;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
		-webkit-tap-highlight-color: transparent;
	}

	.new-entry-pill:hover {
		filter: brightness(1.08);
	}

	.new-entry-pill:active {
		transform: scale(0.97);
	}

	/* Sections */
	.section {
		margin-bottom: 40px;
	}

	.section-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
		letter-spacing: 0.5px;
		text-transform: uppercase;
		margin-bottom: 14px;
	}

	.empty-copy {
		margin: 0;
		padding: 18px 0;
		font-size: 14px;
		line-height: 1.6;
		color: var(--muted);
	}

	/* Mobile */
	@media (max-width: 768px) {
		.home {
			padding: 20px 20px 24px;
		}

		.home-header {
			margin-bottom: 28px;
			padding-top: env(safe-area-inset-top, 0px);
		}

		.home-title {
			font-size: 34px;
		}

		.new-entry-pill {
			padding: 10px 20px;
			font-size: 15px;
			border-radius: 100px;
		}

		.section {
			margin-bottom: 28px;
		}

		.section-label {
			font-size: 12px;
			margin-bottom: 10px;
		}
	}
</style>
