<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import './layout.css';
	import favicon from '$lib/assets/scribe.png';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import MobileNav from '$lib/components/MobileNav.svelte';
	import { setJournalUser } from '$lib/journal';
	import { initTheme } from '$lib/theme.svelte';
	import { sessionLock } from '$lib/session-lock.svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let { children } = $props();
	const sessionState = authClient.useSession();
	const isAuthPage = $derived(page.url.pathname === '/auth');
	const pageTitle = $derived(isAuthPage ? 'Sign In | Scribe' : 'Scribe');
	const authReady = $derived(!$sessionState.isPending);
	const user = $derived($sessionState.data?.user ?? null);

	onMount(() => {
		initTheme();

		function handleVisibilityChange() {
			if (document.visibilityState === 'hidden') {
				sessionLock.lock();
				authClient.signOut();
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
	});

	$effect(() => {
		void setJournalUser(user?.id ?? null);
	});

	$effect(() => {
		if (!authReady) return;

		const next = `${page.url.pathname}${page.url.search}`;

		if ((!user || sessionLock.locked) && !isAuthPage) {
			void goto(`/auth?next=${encodeURIComponent(next)}`, { replaceState: true });
			return;
		}

		if (user && !sessionLock.locked && isAuthPage) {
			const redirectTo = page.url.searchParams.get('next') || '/';
			void goto(redirectTo, { replaceState: true });
		}
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.json" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png" />
	<link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-title" content="Scribe" />
	<meta name="theme-color" content="#007aff" />
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
</svelte:head>

{#if !authReady}
	<div class="loading-shell">
		<div class="loading-inner">
			<h1 class="loading-logo">Scribe</h1>
			<div class="loading-spinner">
				<div class="spinner-track"></div>
			</div>
		</div>
	</div>
{:else if isAuthPage}
	{@render children()}
{:else}
	<div class="app-shell">
		<Sidebar user={user} />
		<main class="main-content">
			{@render children()}
		</main>
	</div>
	<MobileNav />
{/if}

<style>
	.app-shell {
		display: flex;
		height: 100vh;
		height: 100dvh;
		overflow: hidden;
	}

	.main-content {
		flex: 1;
		overflow-y: auto;
		background-color: var(--background);
		-webkit-overflow-scrolling: touch;
	}

	.loading-shell {
		display: grid;
		place-items: center;
		height: 100vh;
		height: 100dvh;
		background: var(--background);
	}

	.loading-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 32px;
		animation: loading-fade-in 0.6s ease-out both;
	}

	.loading-logo {
		font-family: 'Instrument Serif', 'Georgia', serif;
		font-size: 52px;
		font-weight: 400;
		color: var(--foreground);
		letter-spacing: -0.5px;
		line-height: 1;
		opacity: 0.85;
	}

	.loading-spinner {
		width: 28px;
		height: 28px;
		position: relative;
	}

	.spinner-track {
		width: 100%;
		height: 100%;
		border-radius: 50%;
		border: 2.5px solid var(--divider);
		border-top-color: var(--accent);
		animation: loading-spin 0.8s linear infinite;
	}

	@keyframes loading-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes loading-fade-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Mobile: hide sidebar, add bottom padding for tab bar */
	@media (max-width: 768px) {
		.app-shell {
			flex-direction: column;
		}

		.main-content {
			padding-bottom: calc(66px + env(safe-area-inset-bottom, 0px));
		}
	}
</style>
