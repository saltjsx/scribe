<script lang="ts">
	import {
		House,
		MagnifyingGlass,
		BookOpenText,
		PenNib,
		Sun,
		Moon,
		Desktop,
		SignOut,
		XCircle
	} from 'phosphor-svelte';
	import { cycleTheme, getTheme } from '$lib/theme.svelte';
	import { getMoodLabel, getMoodDotColor } from '$lib/entries';
	import { authClient } from '$lib/auth-client';
	import { journalEntries, journalLoaded, syncStatus } from '$lib/journal';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { User } from 'better-auth';

	let { user } = $props<{ user: User | null }>();

	let searchQuery = $state('');
	let searchInput = $state<HTMLInputElement | null>(null);
	let isSigningOut = $state(false);

	const currentPath = $derived(page.url.pathname);
	const currentEntryId = $derived(page.params?.id ?? null);

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

	const initials = $derived(() => {
		const seed = user?.name?.trim() || user?.email?.trim() || 'S';
		return seed
			.split(/\s+/)
			.slice(0, 2)
			.map((part: string) => part[0]?.toUpperCase() ?? '')
			.join('');
	});

	const syncTone = $derived.by(() => {
		switch ($syncStatus.phase) {
			case 'synced':
				return 'synced';
			case 'syncing':
			case 'loading':
				return 'syncing';
			case 'offline':
				return 'offline';
			case 'error':
				return 'error';
			default:
				return $syncStatus.pendingCount > 0 ? 'syncing' : 'idle';
		}
	});

	const syncLabel = $derived.by(() => {
		switch ($syncStatus.phase) {
			case 'loading':
				return 'Loading local journal';
			case 'syncing':
				return $syncStatus.pendingCount > 0
					? `Syncing ${$syncStatus.pendingCount} change${$syncStatus.pendingCount === 1 ? '' : 's'}`
					: 'Syncing';
			case 'synced':
				return 'Synced';
			case 'offline':
				return $syncStatus.pendingCount > 0 ? 'Offline, changes queued' : 'Offline';
			case 'error':
				return $syncStatus.error ?? 'Sync paused';
			default:
				return $syncStatus.pendingCount > 0
					? `${$syncStatus.pendingCount} change${$syncStatus.pendingCount === 1 ? '' : 's'} queued`
					: 'Local first';
		}
	});

	async function signOut() {
		isSigningOut = true;

		const { error } = await authClient.signOut();

		isSigningOut = false;

		if (!error) {
			await goto('/auth');
		}
	}
</script>

<aside class="sidebar">
	<div class="sidebar-header">
		<a href="/" class="logo">Scribe</a>
	</div>

	<!-- Search -->
	<div class="search-wrapper">
		<MagnifyingGlass size={15} weight="regular" class="search-icon" />
		<input
			type="text"
			placeholder="Search"
			bind:value={searchQuery}
			bind:this={searchInput}
			class="search-input"
		/>
		{#if searchQuery}
			<button
				class="search-clear"
				onclick={() => { searchQuery = ''; searchInput?.focus(); }}
				aria-label="Clear search"
			>
				<XCircle size={14} weight="fill" />
			</button>
		{/if}
	</div>

	<!-- Home -->
	<a href="/" class="nav-item" class:active={currentPath === '/'}>
		<House size={18} weight={currentPath === '/' ? 'fill' : 'regular'} />
		<span>Home</span>
	</a>

	<!-- Entries section -->
	<div class="entries-section">
		<h3 class="entries-label">ENTRIES</h3>

		<div class="entries-list">
			{#if filteredEntries().length > 0}
				{#each filteredEntries() as entry (entry.id)}
					<a
						href="/entry/{entry.id}"
						class="entry-item"
						class:selected={currentEntryId === entry.id}
					>
						<div class="entry-row">
							<span class="entry-icon">
								<BookOpenText size={20} weight="regular" />
							</span>
							<div class="entry-details">
								<span class="entry-date">{entry.dateShort}</span>
								<div class="entry-mood">
									<span
										class="mood-dot"
										style="background-color: {getMoodDotColor(entry.mood)}"
									></span>
									<span class="mood-text">
										{getMoodLabel(entry.mood)} &middot; {entry.mood}/10
									</span>
								</div>
							</div>
						</div>
					</a>
				{/each}
			{:else if $journalLoaded}
				<p class="entries-empty">{searchQuery ? 'No matching entries.' : 'No journal entries yet.'}</p>
			{/if}
		</div>
	</div>

	<!-- Bottom section -->
	<div class="sidebar-bottom">
		<a href="/new" class="new-entry-btn">
			<PenNib size={18} weight="fill" />
			<span>New Entry</span>
		</a>

		<div class="divider"></div>

		<div class="user-profile">
			<div class="user-avatar" aria-hidden="true">{initials()}</div>
			<div class="user-copy">
				<span class="user-name">{user?.name ?? 'Scribe user'}</span>
				<span class="user-email">{user?.email ?? ''}</span>
			</div>
			<button class="theme-btn" aria-label="Sign out" onclick={signOut} disabled={isSigningOut}>
				<SignOut size={16} weight="bold" />
			</button>
			<button
				class="theme-btn"
				aria-label="Switch theme ({getTheme()})"
				onclick={cycleTheme}
				title={getTheme() === 'light' ? 'Light' : getTheme() === 'dark' ? 'Dark' : 'System'}
			>
				{#if getTheme() === 'light'}
					<Sun size={16} weight="bold" />
				{:else if getTheme() === 'dark'}
					<Moon size={16} weight="bold" />
				{:else}
					<Desktop size={16} weight="bold" />
				{/if}
			</button>
		</div>

		<div class="sync-pill" title={syncLabel}>
			<span class="sync-dot {syncTone}"></span>
			<span>{syncLabel}</span>
		</div>
	</div>
</aside>

<style>
	.sidebar {
		width: 260px;
		min-width: 260px;
		height: 100dvh;
		display: flex;
		flex-direction: column;
		background-color: var(--sidebar-bg);
		backdrop-filter: saturate(180%) blur(20px);
		-webkit-backdrop-filter: saturate(180%) blur(20px);
		border-right: 0.5px solid var(--divider);
		padding: 16px 10px 10px;
		overflow: hidden;
		user-select: none;
		-webkit-user-select: none;
	}

	@media (max-width: 768px) {
		.sidebar {
			display: none;
		}
	}

	/* Logo */
	.sidebar-header {
		margin-bottom: 14px;
	}

	.logo {
		font-family: 'Instrument Serif', 'Georgia', serif;
		font-size: 28px;
		font-weight: 400;
		color: var(--foreground);
		text-decoration: none;
		display: block;
		margin-bottom: 6px;
		padding-left: 6px;
		letter-spacing: -0.3px;
	}

	.sync-pill {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 0 6px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted);
	}

	.sync-dot {
		width: 7px;
		height: 7px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--muted) 64%, transparent);
		box-shadow: 0 0 0 0 rgba(38, 132, 255, 0);
	}

	.sync-dot.synced {
		background: #22c55e;
	}

	.sync-dot.syncing {
		background: var(--accent);
		animation: sync-blip 1.4s ease-out infinite;
	}

	.sync-dot.offline {
		background: #f59e0b;
	}

	.sync-dot.error {
		background: #ef4444;
	}

	@keyframes sync-blip {
		0% {
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 34%, transparent);
		}

		70% {
			box-shadow: 0 0 0 8px color-mix(in srgb, var(--accent) 0%, transparent);
		}

		100% {
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--accent) 0%, transparent);
		}
	}

	/* Search — macOS Finder style */
	.search-wrapper {
		position: relative;
		margin-bottom: 10px;
	}

	.search-wrapper :global(.search-icon) {
		position: absolute;
		left: 8px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--muted);
		pointer-events: none;
		z-index: 1;
	}

	.search-input {
		width: 100%;
		height: 30px;
		padding: 0 26px 0 28px;
		border-radius: 7px;
		border: 0.5px solid var(--divider);
		background: var(--search-bg);
		color: var(--foreground);
		font-size: 13px;
		font-family: inherit;
		outline: none;
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
		box-shadow: 0 0 0 2.5px color-mix(in srgb, var(--accent) 25%, transparent);
	}

	.search-clear {
		position: absolute;
		right: 6px;
		top: 50%;
		transform: translateY(-50%);
		padding: 0;
		border: none;
		background: transparent;
		color: var(--muted);
		cursor: default;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: color 0.1s;
		z-index: 1;
	}

	.search-clear:hover {
		color: var(--foreground);
	}

	/* Nav items — macOS sidebar style */
	.nav-item {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 8px;
		border-radius: 7px;
		border: none;
		background: transparent;
		color: var(--foreground);
		font-size: 13px;
		font-weight: 500;
		font-family: inherit;
		cursor: default;
		transition: background-color 0.1s;
		text-align: left;
		text-decoration: none;
		line-height: 1.2;
	}

	.nav-item:hover {
		background: var(--hover-bg);
	}

	.nav-item.active {
		background: var(--active-bg);
		color: var(--foreground);
	}

	.nav-item.active :global(svg) {
		color: var(--accent);
	}

	/* Entries section */
	.entries-section {
		flex: 1;
		display: flex;
		flex-direction: column;
		margin-top: 16px;
		overflow: hidden;
		min-height: 0;
	}

	.entries-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--muted);
		letter-spacing: 0.4px;
		text-transform: uppercase;
		margin-bottom: 4px;
		padding-left: 8px;
	}

	.entries-list {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
		scrollbar-width: none;
		mask-image: linear-gradient(to bottom, transparent 0%, black 4px, black calc(100% - 12px), transparent 100%);
		-webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 4px, black calc(100% - 12px), transparent 100%);
	}

	.entries-list::-webkit-scrollbar {
		display: none;
	}

	.entries-empty {
		margin: 0;
		padding: 10px 8px;
		font-size: 12px;
		line-height: 1.5;
		color: var(--muted);
	}

	/* Entry item — compact macOS list style */
	.entry-item {
		display: block;
		width: 100%;
		padding: 7px 8px;
		border-radius: 7px;
		border: none;
		background: transparent;
		cursor: default;
		transition: background-color 0.1s;
		text-align: left;
		text-decoration: none;
		font-family: inherit;
		color: inherit;
	}

	.entry-item:hover {
		background: var(--hover-bg);
	}

	.entry-item.selected {
		background: var(--active-bg);
	}

	.entry-row {
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}

	.entry-icon {
		color: var(--muted);
		margin-top: 1px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.entry-details {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.entry-date {
		font-size: 13px;
		font-weight: 600;
		color: var(--foreground);
		line-height: 1.3;
	}

	.entry-mood {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.mood-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.mood-text {
		font-size: 11.5px;
		color: var(--muted);
		line-height: 1.3;
	}

	/* Bottom section */
	.sidebar-bottom {
		margin-top: auto;
		padding-top: 6px;
		flex-shrink: 0;
	}

	.new-entry-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 8px;
		border-radius: 7px;
		border: none;
		background: transparent;
		color: var(--accent);
		text-decoration: none;
		font-size: 13px;
		font-weight: 500;
		font-family: inherit;
		cursor: default;
		transition: background-color 0.1s;
	}

	.new-entry-btn:hover {
		background: var(--hover-bg);
	}

	.divider {
		height: 0.5px;
		background: var(--divider);
		margin: 8px 6px;
	}

	.user-profile {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 5px 6px;
		border-radius: 7px;
		transition: background-color 0.1s;
	}

	.user-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow: 0 0 0 0.5px var(--divider);
		display: grid;
		place-items: center;
		background: color-mix(in srgb, var(--accent) 16%, var(--sidebar-bg));
		color: var(--accent);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.user-copy {
		min-width: 0;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.user-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--foreground);
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.user-email {
		font-size: 11px;
		color: var(--muted);
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.theme-btn {
		padding: 4px;
		border: none;
		background: transparent;
		color: var(--muted);
		cursor: default;
		border-radius: 5px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			background-color 0.1s,
			color 0.1s;
		flex-shrink: 0;
	}

	.theme-btn:hover {
		background: var(--hover-bg);
		color: var(--foreground);
	}

	.theme-btn:active {
		background: var(--active-bg);
	}

	.theme-btn:disabled {
		opacity: 0.55;
	}
</style>
