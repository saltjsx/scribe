export type Theme = 'light' | 'dark' | 'system';

let theme = $state<Theme>('system');
let resolvedTheme = $state<'light' | 'dark'>('light');

function getSystemTheme(): 'light' | 'dark' {
	if (typeof window === 'undefined') return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(t: Theme) {
	const resolved = t === 'system' ? getSystemTheme() : t;
	resolvedTheme = resolved;
	document.documentElement.setAttribute('data-theme', resolved);
}

export function initTheme() {
	const stored = localStorage.getItem('theme') as Theme | null;
	if (stored && ['light', 'dark', 'system'].includes(stored)) {
		theme = stored;
	}
	applyTheme(theme);

	// Listen for system theme changes
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		if (theme === 'system') {
			applyTheme('system');
		}
	});
}

export function setTheme(t: Theme) {
	theme = t;
	localStorage.setItem('theme', t);
	applyTheme(t);
}

export function cycleTheme() {
	const order: Theme[] = ['light', 'dark', 'system'];
	const next = order[(order.indexOf(theme) + 1) % order.length];
	setTheme(next);
}

export function getTheme(): Theme {
	return theme;
}

export function getResolvedTheme(): 'light' | 'dark' {
	return resolvedTheme;
}
