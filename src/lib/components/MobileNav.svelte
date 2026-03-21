<script lang="ts">
	import { House, BookOpenText, PenNib, GearSix } from 'phosphor-svelte';
	import { page } from '$app/state';
	import { triggerHaptic } from '$lib/haptics';

	const currentPath = $derived(page.url.pathname);

	const tabs = [
		{ href: '/', label: 'Home', icon: House, match: (p: string) => p === '/' },
		{
			href: '/entries',
			label: 'Entries',
			icon: BookOpenText,
			match: (p: string) => p === '/entries' || p.startsWith('/entry/')
		},
		{ href: '/new', label: 'New', icon: PenNib, match: (p: string) => p === '/new', accent: true },
		{
			href: '/settings',
			label: 'Settings',
			icon: GearSix,
			match: (p: string) => p === '/settings'
		}
	] as const;
</script>

<nav class="mobile-nav">
	{#each tabs as tab}
		{@const active = tab.match(currentPath)}
		<a
			href={tab.href}
			class="mobile-nav-item"
			class:active
			class:accent={'accent' in tab && tab.accent}
			aria-current={active ? 'page' : undefined}
			onclick={() => {
				if (!active) {
					triggerHaptic('selection');
				}
			}}
		>
			<span class="mobile-nav-icon">
				<tab.icon size={24} weight={active ? 'fill' : 'regular'} />
			</span>
			<span class="mobile-nav-label">{tab.label}</span>
		</a>
	{/each}
</nav>

<style>
	.mobile-nav {
		display: none;
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 100;
		background: var(--tab-bar-bg);
		backdrop-filter: saturate(180%) blur(20px);
		-webkit-backdrop-filter: saturate(180%) blur(20px);
		border-top: 0.5px solid var(--divider);
		padding-bottom: env(safe-area-inset-bottom, 0px);
		display: flex;
		justify-content: space-around;
		align-items: stretch;
	}

	.mobile-nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		flex: 1;
		padding: 8px 0 6px;
		text-decoration: none;
		color: var(--muted);
		transition: color 0.15s;
		-webkit-tap-highlight-color: transparent;
		min-height: 50px;
	}

	.mobile-nav-item.active {
		color: var(--accent);
	}

	.mobile-nav-item.accent .mobile-nav-icon {
		background: var(--accent);
		color: #ffffff;
		width: 44px;
		height: 30px;
		border-radius: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.mobile-nav-item.accent.active .mobile-nav-icon {
		background: var(--accent);
		color: #ffffff;
	}

	.mobile-nav-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 30px;
	}

	.mobile-nav-label {
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.01em;
		line-height: 1;
	}

	/* Only show on mobile */
	@media (min-width: 769px) {
		.mobile-nav {
			display: none !important;
		}
	}

	@media (max-width: 768px) {
		.mobile-nav {
			display: flex;
		}
	}
</style>
