<script lang="ts">
	import { getMoodTimeline } from '$lib/entries';
	import { journalEntries } from '$lib/journal';

	const moodData = $derived(getMoodTimeline($journalEntries));

	function getMoodColor(mood: number): string {
		if (mood >= 9) return '#34c759';
		if (mood >= 7) return '#007aff';
		if (mood >= 5) return '#ff9500';
		if (mood >= 3) return '#ff6030';
		return '#ff3b30';
	}

	const width = 900;
	const height = 220;
	const padX = 8;
	const padTop = 16;
	const padBottom = 16;

	const graphWidth = width - padX * 2;
	const graphHeight = height - padTop - padBottom;

	const timeBounds = $derived.by(() => {
		const minTime = moodData.length > 0 ? moodData[0].date.getTime() : 0;
		const maxTime = moodData.length > 0 ? moodData[moodData.length - 1].date.getTime() : 1;
		return {
			minTime,
			maxTime,
			timeRange: maxTime - minTime || 1
		};
	});

	function toX(date: Date): number {
		return padX + ((date.getTime() - timeBounds.minTime) / timeBounds.timeRange) * graphWidth;
	}

	function toY(mood: number): number {
		return padTop + graphHeight - ((mood - 1) / 9) * graphHeight;
	}

	interface Segment {
		path: string;
		color1: string;
		color2: string;
		gradId: string;
	}

	function buildSegments(): Segment[] {
		if (moodData.length < 2) return [];
		const points = moodData.map((p) => ({ x: toX(p.date), y: toY(p.mood), mood: p.mood }));
		const segments: Segment[] = [];

		for (let i = 0; i < points.length - 1; i++) {
			const p0 = points[Math.max(0, i - 1)];
			const p1 = points[i];
			const p2 = points[i + 1];
			const p3 = points[Math.min(points.length - 1, i + 2)];

			const tension = 0.35;
			const cp1x = p1.x + (p2.x - p0.x) * tension;
			const cp1y = p1.y + (p2.y - p0.y) * tension;
			const cp2x = p2.x - (p3.x - p1.x) * tension;
			const cp2y = p2.y - (p3.y - p1.y) * tension;

			const d = `M ${p1.x},${p1.y} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;

			segments.push({
				path: d,
				color1: getMoodColor(p1.mood),
				color2: getMoodColor(p2.mood),
				gradId: `seg-${i}`
			});
		}

		return segments;
	}

	function buildFullPath(): string {
		if (moodData.length < 2) return '';
		const points = moodData.map((p) => ({ x: toX(p.date), y: toY(p.mood) }));
		let d = `M ${points[0].x},${points[0].y}`;

		for (let i = 0; i < points.length - 1; i++) {
			const p0 = points[Math.max(0, i - 1)];
			const p1 = points[i];
			const p2 = points[i + 1];
			const p3 = points[Math.min(points.length - 1, i + 2)];
			const tension = 0.35;
			const cp1x = p1.x + (p2.x - p0.x) * tension;
			const cp1y = p1.y + (p2.y - p0.y) * tension;
			const cp2x = p2.x - (p3.x - p1.x) * tension;
			const cp2y = p2.y - (p3.y - p1.y) * tension;
			d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
		}

		const last = points[points.length - 1];
		const first = points[0];
		return `${d} L ${last.x},${height} L ${first.x},${height} Z`;
	}

	const segments = buildSegments();
	const fillPath = buildFullPath();
</script>

<div class="mood-graph">
	{#if moodData.length >= 2}
		<svg width="100%" viewBox="0 0 {width} {height}" preserveAspectRatio="none" class="mood-svg">
			<defs>
				<linearGradient id="moodFillGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.1" />
					<stop offset="100%" stop-color="var(--accent)" stop-opacity="0.01" />
				</linearGradient>

				{#each segments as seg}
					<linearGradient id={seg.gradId} x1="0" y1="0" x2="1" y2="0">
						<stop offset="0%" stop-color={seg.color1} />
						<stop offset="100%" stop-color={seg.color2} />
					</linearGradient>
				{/each}
			</defs>

			<path d={fillPath} fill="url(#moodFillGrad)" />

			{#each segments as seg}
				<path
					d={seg.path}
					fill="none"
					stroke="url(#{seg.gradId})"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			{/each}
		</svg>
	{:else}
		<div class="empty">Not enough entries to show mood trends.</div>
	{/if}
</div>

<style>
	.mood-graph {
		width: 100%;
	}

	.mood-svg {
		display: block;
	}

	.empty {
		padding: 32px 0;
		text-align: center;
		color: var(--muted);
		font-size: 13px;
	}
</style>
