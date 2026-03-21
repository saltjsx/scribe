<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';

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
			errorMessage = response.error.message || 'Authentication failed.';
			return;
		}

		await goto(nextUrl, { invalidateAll: true });
	}
</script>

<div class="auth-shell">
	<div class="auth-card">
		<div class="auth-copy">
			<p class="eyebrow">Scribe</p>
			<h1>{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
			<p>Simple email and password auth. No verification step.</p>
		</div>

		<form
			class="auth-form"
			onsubmit={async (event) => {
				event.preventDefault();
				await submit();
			}}
		>
			{#if mode === 'signup'}
				<label class="field">
					<span>Name</span>
					<input
						type="text"
						bind:value={name}
						placeholder="Abdul"
						autocomplete="name"
						oninput={resetError}
					/>
				</label>
			{/if}

			<label class="field">
				<span>Email</span>
				<input
					type="email"
					bind:value={email}
					placeholder="you@example.com"
					autocomplete="email"
					required
					oninput={resetError}
				/>
			</label>

			<label class="field">
				<span>Password</span>
				<input
					type="password"
					bind:value={password}
					placeholder="At least 8 characters"
					autocomplete={mode === 'signin' ? 'current-password' : 'new-password'}
					minlength="8"
					required
					oninput={resetError}
				/>
			</label>

			{#if errorMessage}
				<p class="error">{errorMessage}</p>
			{/if}

			<button class="submit" type="submit" disabled={isSubmitting}>
				{isSubmitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
			</button>
		</form>

		<button
			class="switch"
			type="button"
			onclick={() => {
				mode = mode === 'signin' ? 'signup' : 'signin';
				resetError();
			}}
		>
			{mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
		</button>
	</div>
</div>

<style>
	:global(body) {
		min-height: 100vh;
	}

	.auth-shell {
		min-height: 100vh;
		display: grid;
		place-items: center;
		padding: 24px;
		background:
			radial-gradient(circle at top, rgba(0, 122, 255, 0.12), transparent 32%),
			linear-gradient(180deg, #faf8f3 0%, #f4f1ea 100%);
	}

	.auth-card {
		width: min(100%, 420px);
		padding: 32px;
		border-radius: 28px;
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(18px);
		border: 1px solid rgba(15, 23, 42, 0.08);
		box-shadow: 0 24px 80px rgba(15, 23, 42, 0.12);
	}

	.auth-copy {
		margin-bottom: 24px;
	}

	.eyebrow {
		margin: 0 0 10px;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #2563eb;
	}

	h1 {
		margin: 0 0 8px;
		font-family: 'Instrument Serif', 'Georgia', serif;
		font-size: 42px;
		font-weight: 400;
		letter-spacing: -0.04em;
		color: #111827;
	}

	.auth-copy p:last-child {
		margin: 0;
		color: #4b5563;
		line-height: 1.5;
	}

	.auth-form {
		display: grid;
		gap: 14px;
	}

	.field {
		display: grid;
		gap: 7px;
	}

	.field span {
		font-size: 13px;
		font-weight: 600;
		color: #374151;
	}

	.field input {
		height: 46px;
		padding: 0 14px;
		border-radius: 14px;
		border: 1px solid rgba(15, 23, 42, 0.12);
		background: rgba(255, 255, 255, 0.92);
		font: inherit;
		color: #111827;
		outline: none;
		transition:
			border-color 0.15s,
			box-shadow 0.15s,
			transform 0.15s;
	}

	.field input:focus {
		border-color: #2563eb;
		box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.14);
		transform: translateY(-1px);
	}

	.error {
		margin: 0;
		padding: 12px 14px;
		border-radius: 14px;
		background: rgba(239, 68, 68, 0.08);
		color: #b91c1c;
		font-size: 13px;
	}

	.submit {
		height: 48px;
		border: none;
		border-radius: 14px;
		background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
		color: white;
		font: inherit;
		font-weight: 700;
		cursor: default;
		box-shadow: 0 14px 32px rgba(37, 99, 235, 0.22);
		transition:
			transform 0.15s,
			box-shadow 0.15s,
			opacity 0.15s;
	}

	.submit:hover {
		transform: translateY(-1px);
		box-shadow: 0 18px 36px rgba(37, 99, 235, 0.28);
	}

	.submit:disabled {
		opacity: 0.7;
	}

	.switch {
		margin-top: 16px;
		padding: 0;
		border: none;
		background: transparent;
		color: #1d4ed8;
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		cursor: default;
	}

	/* Mobile */
	@media (max-width: 768px) {
		.auth-shell {
			padding: 20px;
			padding-top: calc(20px + env(safe-area-inset-top, 0px));
			align-items: start;
			padding-top: max(60px, env(safe-area-inset-top, 0px));
		}

		.auth-card {
			padding: 28px 24px;
			border-radius: 24px;
		}

		h1 {
			font-size: 36px;
		}

		.field input {
			height: 50px;
			font-size: 16px;
		}

		.submit {
			height: 52px;
			font-size: 16px;
		}

		.switch {
			font-size: 15px;
			padding: 8px 0;
		}
	}
</style>
