import { browser } from '$app/environment';
import { WebHaptics } from 'web-haptics';
import type { HapticInput } from 'web-haptics';

let haptics: WebHaptics | null = null;

function getHaptics(): WebHaptics | null {
	if (!browser) return null;
	haptics ??= new WebHaptics();
	return haptics;
}

export function triggerHaptic(input: HapticInput = 'medium'): void {
	void getHaptics()?.trigger(input);
}

