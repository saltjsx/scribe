import { getRequestEvent } from '$app/server';
import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { authDb } from '$lib/server/auth-db';
import { getPrivateEnv } from '$lib/server/private-env';

const betterAuthSecret = getPrivateEnv('BETTER_AUTH_SECRET');

if (!betterAuthSecret) {
	throw new Error('BETTER_AUTH_SECRET is missing');
}

export const auth = betterAuth({
	database: {
		db: authDb,
		type: 'postgres'
	},
	baseURL: getPrivateEnv('BETTER_AUTH_URL') || undefined,
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
