export interface Entry {
	id: string;
	createdAt: string;
	updatedAt: string;
	date: string; // Full date "Friday, March 20, 2026"
	dateShort: string; // Short "Mar 20, 2026"
	mood: number;
	body: string; // HTML content
}

export function formatEntryDates(date: Date): Pick<Entry, 'date' | 'dateShort'> {
	return {
		date: date.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}),
		dateShort: date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	};
}

export function getMoodLabel(mood: number): string {
	if (mood >= 9) return 'Wonderful';
	if (mood >= 7) return 'Good';
	if (mood >= 5) return 'Okay';
	if (mood >= 3) return 'Low';
	return 'Rough';
}

export function getMoodColor(mood: number): string {
	if (mood >= 9) return '#34c759';
	if (mood >= 7) return '#34c759';
	if (mood >= 5) return '#ff9500';
	if (mood >= 3) return '#ff6030';
	return '#ff3b30';
}

export function getMoodEmoji(mood: number): string {
	if (mood >= 9) return '\u{1F929}';
	if (mood >= 7) return '\u{1F60A}';
	if (mood >= 5) return '\u{1F642}';
	if (mood >= 3) return '\u{1F614}';
	return '\u{1F61E}';
}

export function getMoodDotColor(mood: number): string {
	if (mood >= 9) return '#34c759';
	if (mood >= 7) return '#007aff';
	if (mood >= 5) return '#ff9500';
	if (mood >= 3) return '#ff6030';
	return '#ff3b30';
}

export function sortEntriesByDate(entries: Entry[]): Entry[] {
	return [...entries].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	);
}

/**
 * Parse an entry timestamp into a Date object.
 */
export function parseEntryDate(entry: Pick<Entry, 'createdAt'>): Date {
	return new Date(entry.createdAt);
}

/**
 * Get entry counts per day as a Map<"YYYY-MM-DD", number>
 */
export function getEntriesPerDay(entries: Entry[]): Map<string, number> {
	const map = new Map<string, number>();
	for (const entry of entries) {
		const d = parseEntryDate(entry);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		map.set(key, (map.get(key) || 0) + 1);
	}
	return map;
}

/**
 * Get mood data points sorted by date for the mood graph.
 * Averages mood for days with multiple entries so there's one clean point per day.
 */
export function getMoodTimeline(entries: Entry[]): { date: Date; mood: number }[] {
	const dayMap = new Map<string, { date: Date; moods: number[] }>();

	for (const entry of entries) {
		const d = parseEntryDate(entry);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		const existing = dayMap.get(key);
		if (existing) {
			existing.moods.push(entry.mood);
		} else {
			dayMap.set(key, { date: d, moods: [entry.mood] });
		}
	}

	return Array.from(dayMap.values())
		.map((d) => ({
			date: d.date,
			mood: Math.round(d.moods.reduce((a, b) => a + b, 0) / d.moods.length)
		}))
		.sort((a, b) => a.date.getTime() - b.date.getTime());
}
