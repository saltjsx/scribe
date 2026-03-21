<script lang="ts">
	import { getEntriesPerDay } from '$lib/entries';
	import { journalEntries } from '$lib/journal';

	interface DayData {
		date: Date;
		count: number;
		key: string;
	}

	const entryCounts = $derived(getEntriesPerDay($journalEntries));

	function generateYearData(counts: Map<string, number>): DayData[] {
		const today = new Date();
		const days: DayData[] = [];

		const endDay = new Date(today);
		endDay.setDate(endDay.getDate() + (6 - endDay.getDay()));

		const startDay = new Date(endDay);
		startDay.setDate(startDay.getDate() - 52 * 7 + 1);

		for (let d = new Date(startDay); d <= endDay; d.setDate(d.getDate() + 1)) {
			const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
			const isFuture = d > today;
			const count = isFuture ? 0 : (counts.get(key) || 0);
			days.push({ date: new Date(d), count, key });
		}

		return days;
	}

	const cellSize = 14;
	const cellGap = 3;
	const cellRadius = 3;
	const step = cellSize + cellGap;

	const data = $derived(generateYearData(entryCounts));
	const weeks = $derived.by(() => {
		const grouped: DayData[][] = [];
		let currentWeek: DayData[] = [];

		for (const day of data) {
			if (day.date.getDay() === 0 && currentWeek.length > 0) {
				grouped.push(currentWeek);
				currentWeek = [];
			}
			currentWeek.push(day);
		}

		if (currentWeek.length > 0) grouped.push(currentWeek);
		return grouped;
	});

	const svgWidth = $derived(weeks.length * step);
	const svgHeight = 7 * step;

	function getColor(count: number): string {
		if (count === 0) return 'var(--contrib-0)';
		if (count === 1) return 'var(--contrib-1)';
		if (count === 2) return 'var(--contrib-2)';
		if (count >= 3) return 'var(--contrib-3)';
		return 'var(--contrib-0)';
	}
</script>

<div class="graph-container">
	<svg width="100%" viewBox="0 0 {svgWidth} {svgHeight}" class="graph-svg">
		{#each weeks as week, wi}
			{#each week as day}
				<rect
					x={wi * step}
					y={day.date.getDay() * step}
					width={cellSize}
					height={cellSize}
					rx={cellRadius}
					ry={cellRadius}
					fill={getColor(day.count)}
				>
					<title>{day.key}: {day.count} {day.count === 1 ? 'entry' : 'entries'}</title>
				</rect>
			{/each}
		{/each}
	</svg>

	<div class="legend">
		<span class="legend-label">Less</span>
		<span class="legend-cell" style="background: var(--contrib-0)"></span>
		<span class="legend-cell" style="background: var(--contrib-1)"></span>
		<span class="legend-cell" style="background: var(--contrib-2)"></span>
		<span class="legend-cell" style="background: var(--contrib-3)"></span>
		<span class="legend-label">More</span>
	</div>
</div>

<style>
	.graph-container {
		width: 100%;
	}

	.graph-svg {
		display: block;
	}

	.legend {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 4px;
		margin-top: 10px;
	}

	.legend-label {
		font-size: 11px;
		color: var(--muted);
		padding: 0 2px;
	}

	.legend-cell {
		width: 12px;
		height: 12px;
		border-radius: 2.5px;
	}
</style>
