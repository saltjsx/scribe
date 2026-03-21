import { getRequestEvent } from '$app/server';
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { authDb } from '$lib/server/auth-db';
import { getPrivateEnv } from '$lib/server/private-env';

const betterAuthSecret = getPrivateEnv('BETTER_AUTH_SECRET');

if (!betterAuthSecret) {
	throw new Error('BETTER_AUTH_SECRET is missing');
}

function getAuthBaseUrlConfig() {
	const configuredBaseUrl = getPrivateEnv('BETTER_AUTH_URL');
	const allowedHosts = ['localhost:*', '127.0.0.1:*'];

	if (configuredBaseUrl) {
		try {
			allowedHosts.push(new URL(configuredBaseUrl).host);
		} catch {
			// Ignore malformed optional config and fall back to the local defaults.
		}
	}

	return {
		allowedHosts: [...new Set(allowedHosts)],
		fallback: configuredBaseUrl || 'http://localhost:5173'
	};
}

export const auth = betterAuth({
	database: {
		db: authDb,
		type: 'postgres'
	},
	baseURL: getAuthBaseUrlConfig(),
	secret: betterAuthSecret,
	user: {
		modelName: 'users'
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		autoSignIn: true
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});
