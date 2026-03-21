<script lang="ts">
	import {
		Sun,
		Moon,
		Desktop,
		SignOut,
		CloudCheck,
		CloudSlash,
		CloudArrowUp,
		ArrowsClockwise,
		Warning
	} from 'phosphor-svelte';
	import { cycleTheme, getTheme } from '$lib/theme.svelte';
	import { authClient } from '$lib/auth-client';
	import { setJournalUser, syncStatus } from '$lib/journal';
	import { goto } from '$app/navigation';
	import type { User } from 'better-auth';

	const sessionState = authClient.useSession();
	const user = $derived($sessionState.data?.user ?? null);

	let isSigningOut = $state(false);

	const initials = $derived(() => {
		const seed = user?.name?.trim() || user?.email?.trim() || 'S';
		return seed
			.split(/\s+/)
			.slice(0, 2)
			.map((part: string) => part[0]?.toUpperCase() ?? '')
			.join('');
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
				return 'All changes synced';
			case 'offline':
				return $syncStatus.pendingCount > 0 ? 'Offline — changes queued' : 'Offline';
			case 'error':
				return $syncStatus.error ?? 'Sync paused';
			default:
				return $syncStatus.pendingCount > 0
					? `${$syncStatus.pendingCount} change${$syncStatus.pendingCount === 1 ? '' : 's'} queued`
					: 'Up to date';
		}
	});

	const syncIcon = $derived.by(() => {
		switch ($syncStatus.phase) {
			case 'synced':
				return CloudCheck;
			case 'syncing':
			case 'loading':
				return ArrowsClockwise;
			case 'offline':
				return CloudSlash;
			case 'error':
				return Warning;
			default:
				return CloudArrowUp;
		}
	});

	const themeLabel = $derived(
		getTheme() === 'light' ? 'Light' : getTheme() === 'dark' ? 'Dark' : 'System'
	);

	async function signOut() {
		isSigningOut = true;
		const { error } = await authClient.signOut();
		if (!error) {
			await setJournalUser(null);
		}
		isSigningOut = false;
		if (!error) {
			await goto('/auth', { invalidateAll: true, replaceState: true });
		}
	}
</script>

<div class="settings-page">
	<header class="settings-header">
		<h1 class="settings-title">Settings</h1>
	</header>

	<!-- Profile section -->
	<section class="settings-section">
		<div class="profile-card">
			<div class="profile-avatar" aria-hidden="true">{initials()}</div>
			<div class="profile-info">
				<span class="profile-name">{user?.name ?? 'Scribe user'}</span>
				<span class="profile-email">{user?.email ?? ''}</span>
			</div>
		</div>
	</section>

	<!-- Appearance -->
	<section class="settings-section">
		<h2 class="section-label">APPEARANCE</h2>
		<button class="settings-row" onclick={cycleTheme}>
			<span class="settings-row-left">
				{#if getTheme() === 'light'}
					<Sun size={22} weight="regular" />
				{:else if getTheme() === 'dark'}
					<Moon size={22} weight="regular" />
				{:else}
					<Desktop size={22} weight="regular" />
				{/if}
				<span>Theme</span>
			</span>
			<span class="settings-row-value">{themeLabel}</span>
		</button>
	</section>

	<!-- Sync -->
	<section class="settings-section">
		<h2 class="section-label">SYNC</h2>
		<div class="settings-row static">
			<span class="settings-row-left">
				<svelte:component this={syncIcon} size={22} weight="regular" />
				<span>Status</span>
			</span>
			<span class="settings-row-value sync-value {$syncStatus.phase}">{syncLabel}</span>
		</div>
	</section>

	<!-- Account -->
	<section class="settings-section">
		<h2 class="section-label">ACCOUNT</h2>
		<button class="settings-row danger" onclick={signOut} disabled={isSigningOut}>
			<span class="settings-row-left">
				<SignOut size={22} weight="regular" />
				<span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
			</span>
		</button>
	</section>

	<p class="settings-footer">Scribe — Your personal journal</p>
</div>

<style>
	.settings-page {
		padding: 20px 20px 100px;
		max-width: 600px;
		margin: 0 auto;
	}

	.settings-header {
		margin-bottom: 28px;
		padding-top: env(safe-area-inset-top, 0px);
	}

	.settings-title {
		font-family: 'Instrument Serif', 'Georgia', serif;
		font-size: 34px;
		font-weight: 400;
		color: var(--foreground);
		letter-spacing: -0.3px;
		line-height: 1;
	}

	/* Profile card */
	.profile-card {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 16px;
		background: var(--surface);
		border-radius: 16px;
		border: 0.5px solid var(--divider);
	}

	.profile-avatar {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		flex-shrink: 0;
		display: grid;
		place-items: center;
		background: color-mix(in srgb, var(--accent) 16%, var(--background));
		color: var(--accent);
		font-size: 16px;
		font-weight: 700;
		letter-spacing: 0.08em;
	}

	.profile-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.profile-name {
		font-size: 17px;
		font-weight: 600;
		color: var(--foreground);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.profile-email {
		font-size: 14px;
		color: var(--muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Sections */
	.settings-section {
		margin-bottom: 28px;
	}

	.section-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--muted);
		letter-spacing: 0.5px;
		text-transform: uppercase;
		margin-bottom: 8px;
		padding-left: 4px;
	}

	/* Settings rows */
	.settings-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 14px 16px;
		background: var(--surface);
		border: 0.5px solid var(--divider);
		border-radius: 14px;
		font-family: inherit;
		font-size: 16px;
		color: var(--foreground);
		cursor: default;
		-webkit-tap-highlight-color: transparent;
		transition: background-color 0.1s;
	}

	.settings-row:active:not(.static) {
		background: var(--hover-bg);
	}

	.settings-row.danger {
		color: #ef4444;
	}

	.settings-row.danger:disabled {
		opacity: 0.55;
	}

	.settings-row-left {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.settings-row-value {
		font-size: 15px;
		color: var(--muted);
		font-weight: 500;
	}

	.sync-value.synced {
		color: #22c55e;
	}

	.sync-value.syncing {
		color: var(--accent);
	}

	.sync-value.offline {
		color: #f59e0b;
	}

	.sync-value.error {
		color: #ef4444;
	}

	.settings-footer {
		text-align: center;
		font-size: 13px;
		color: var(--muted);
		margin-top: 40px;
		padding-bottom: 20px;
	}

	/* Desktop */
	@media (min-width: 769px) {
		.settings-page {
			padding: 40px 48px;
		}

		.settings-title {
			font-size: 42px;
		}
	}
</style>
