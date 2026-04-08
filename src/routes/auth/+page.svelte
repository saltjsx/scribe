<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import { triggerHaptic } from '$lib/haptics';
	import { setJournalUser } from '$lib/journal';
	import { sessionLock } from '$lib/session-lock.svelte';

	let mode = $state<'signin' | 'signup'>('signin');
	let name = $state('');
	let email = $state('');
	let password = $state('');
	let errorMessage = $state('');
	let isSubmitting = $state(false);

	const nextUrl = $derived(page.url.searchParams.get('next') || '/');

	function resetError() {
		errorMessage = '';
	}

	async function submit() {
		resetError();
		isSubmitting = true;
		triggerHaptic('medium');

		const response =
			mode === 'signup'
				? await authClient.signUp.email({
						name: name.trim() || email.split('@')[0] || 'Scribe user',
						email,
						password
					})
				: await authClient.signIn.email({
						email,
						password
					});

		isSubmitting = false;

		if (response.error) {
			triggerHaptic('error');
			errorMessage = response.error.message || 'Authentication failed.';
			return;
		}

		triggerHaptic('success');
		sessionLock.unlock();
		await setJournalUser(response.data?.user?.id ?? null);
		await goto(nextUrl, { invalidateAll: true });
	}
</script>

<div class="auth-shell">
	<div class="auth-inner">
		<h1 class="logo">Scribe</h1>
		<p class="subtitle">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</p>

		<form
			class="form"
			onsubmit={async (e) => {
				e.preventDefault();
				await submit();
			}}
		>
			{#if mode === 'signup'}
				<input
					type="text"
					bind:value={name}
					placeholder="Name"
					autocomplete="name"
					aria-label="Name"
					oninput={resetError}
				/>
			{/if}

			<input
				type="email"
				bind:value={email}
				placeholder="Email"
				autocomplete="email"
				aria-label="Email"
				required
				oninput={resetError}
			/>

			<input
				type="password"
				bind:value={password}
				placeholder="Password"
				autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
				aria-label="Password"
				minlength="8"
				required
				oninput={resetError}
			/>

			{#if errorMessage}
				<p class="error">{errorMessage}</p>
			{/if}

			<button type="submit" disabled={isSubmitting}>
				{isSubmitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
			</button>
		</form>

		<button
			class="toggle"
			type="button"
			onclick={() => {
				triggerHaptic('selection');
				mode = mode === 'signin' ? 'signup' : 'signin';
				resetError();
			}}
		>
			{mode === 'signin' ? 'Create account' : 'Sign in instead'}
		</button>
	</div>
</div>

<style>
	.auth-shell {
		min-height: 100vh;
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 24px;
		background: var(--background);
	}

	.auth-inner {
		width: min(100%, 300px);
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.logo {
		font-family: 'Instrument Serif', 'Georgia', serif;
		font-size: 52px;
		font-weight: 400;
		color: var(--foreground);
		letter-spacing: -0.5px;
		line-height: 1;
		margin: 0 0 10px;
		opacity: 0.85;
	}

	.subtitle {
		color: var(--muted);
		font-size: 14px;
		margin: 0 0 32px;
	}

	.form {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.form input {
		height: 44px;
		padding: 0 14px;
		border-radius: 10px;
		border: 1px solid var(--divider);
		background: var(--surface);
		color: var(--foreground);
		font: inherit;
		font-size: 14px;
		outline: none;
		transition: border-color 0.15s;
	}

	.form input:focus {
		border-color: var(--accent);
	}

	.form input::placeholder {
		color: var(--muted);
	}

	.form button {
		height: 44px;
		margin-top: 4px;
		border: none;
		border-radius: 10px;
		background: var(--accent);
		color: #fff;
		font: inherit;
		font-weight: 600;
		font-size: 14px;
		cursor: default;
		transition: opacity 0.15s;
	}

	.form button:active {
		opacity: 0.8;
	}

	.form button:disabled {
		opacity: 0.5;
	}

	.error {
		margin: 0;
		padding: 10px 14px;
		border-radius: 10px;
		background: rgba(255, 59, 48, 0.08);
		color: #ff3b30;
		font-size: 13px;
	}

	:root[data-theme='dark'] .error {
		background: rgba(255, 69, 58, 0.12);
		color: #ff453a;
	}

	.toggle {
		margin-top: 24px;
		padding: 0;
		border: none;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 13px;
		cursor: default;
		transition: color 0.15s;
	}

	.toggle:hover {
		color: var(--foreground);
	}

	@media (max-width: 768px) {
		.auth-shell {
			padding: 20px;
			padding-top: max(80px, env(safe-area-inset-top, 0px));
			align-items: start;
		}

		.auth-inner {
			width: 100%;
			max-width: 340px;
			margin: 0 auto;
		}

		.form input {
			height: 50px;
			font-size: 16px;
		}

		.form button {
			height: 50px;
			font-size: 16px;
		}
	}
</style>
