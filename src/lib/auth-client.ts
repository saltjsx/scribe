import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
	sessionOptions: {
		refetchOnWindowFocus: true
	}
});
