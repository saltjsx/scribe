// Client-side session lock — forces re-authentication on every
// fresh page load and every tab/app switch for privacy.
// The lock state lives in memory so it resets on reload automatically.

let locked = $state(true);

export const sessionLock = {
	get locked() {
		return locked;
	},
	lock() {
		locked = true;
	},
	unlock() {
		locked = false;
	}
};
