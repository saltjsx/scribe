<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getMoodTimeline } from '$lib/entries';
	import { journalEntries } from '$lib/journal';
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Filler,
		Tooltip
	} from 'chart.js';

	Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	const moodData = $derived(getMoodTimeline($journalEntries));

	function getMoodColor(mood: number): string {
		if (mood >= 9) return '#34c759';
		if (mood >= 7) return '#007aff';
		if (mood >= 5) return '#ff9500';
		if (mood >= 3) return '#ff6030';
		return '#ff3b30';
	}

	function buildGradientSegments(data: { mood: number }[]): string[] {
		if (data.length < 2) return [];
		const colors: string[] = [];
		for (let i = 0; i < data.length; i++) {
			colors.push(getMoodColor(data[i].mood));
		}
		return colors;
	}

	function createOrUpdateChart() {
		if (!canvas || moodData.length < 2) {
			if (chart) {
				chart.destroy();
				chart = null;
			}
			return;
		}

		const labels = moodData.map((p) =>
			p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
		);
		const values = moodData.map((p) => p.mood);
		const segmentColors = buildGradientSegments(moodData);

		const style = getComputedStyle(document.documentElement);
		const accent = style.getPropertyValue('--accent').trim() || '#007aff';
		const muted = style.getPropertyValue('--muted').trim() || 'rgba(60,60,67,0.55)';
		const divider = style.getPropertyValue('--divider').trim() || 'rgba(60,60,67,0.1)';

		const config = {
			type: 'line' as const,
			data: {
				labels,
				datasets: [
					{
						data: values,
						fill: true,
						backgroundColor: (ctx: { chart: Chart }) => {
							const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
							gradient.addColorStop(0, `${accent}1a`);
							gradient.addColorStop(1, `${accent}03`);
							return gradient;
						},
						segment: {
							borderColor: (ctx: { p0DataIndex: number; p1DataIndex: number }) =>
								segmentColors[ctx.p0DataIndex] || accent
						},
						borderWidth: 2.5,
						pointRadius: 0,
						pointHitRadius: 12,
						pointHoverRadius: 4,
						pointHoverBackgroundColor: accent,
						pointHoverBorderColor: '#fff',
						pointHoverBorderWidth: 2,
						tension: 0.35
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: 'index' as const,
					intersect: false
				},
				plugins: {
					tooltip: {
						backgroundColor: 'rgba(0,0,0,0.72)',
						titleFont: { size: 12, weight: 'bold' as const },
						bodyFont: { size: 13 },
						padding: 10,
						cornerRadius: 10,
						displayColors: false,
						callbacks: {
							label: (ctx: { parsed: { y: number | null } }) => {
								const mood = ctx.parsed.y ?? 0;
								const label =
									mood >= 9
										? 'Wonderful'
										: mood >= 7
											? 'Good'
											: mood >= 5
												? 'Okay'
												: mood >= 3
													? 'Low'
													: 'Rough';
								return `${mood}/10 — ${label}`;
							}
						}
					}
				},
				scales: {
					x: {
						display: false
					},
					y: {
						min: 1,
						max: 10,
						display: false
					}
				},
				layout: {
					padding: { top: 8, bottom: 8, left: 4, right: 4 }
				}
			}
		};

		if (chart) {
			chart.data = config.data;
			chart.options = config.options;
			chart.update('none');
		} else {
			chart = new Chart(canvas, config);
		}
	}

	onMount(() => {
		createOrUpdateChart();
	});

	onDestroy(() => {
		if (chart) {
			chart.destroy();
			chart = null;
		}
	});

	$effect(() => {
		// Re-run whenever moodData changes
		void moodData;
		if (canvas) {
			createOrUpdateChart();
		}
	});
</script>

<div class="mood-graph">
	{#if moodData.length >= 2}
		<div class="chart-container">
			<canvas bind:this={canvas}></canvas>
		</div>
	{:else}
		<div class="empty">Not enough entries to show mood trends.</div>
	{/if}
</div>

<style>
	.mood-graph {
		width: 100%;
	}

	.chart-container {
		position: relative;
		width: 100%;
		height: 180px;
	}

	.empty {
		padding: 32px 0;
		text-align: center;
		color: var(--muted);
		font-size: 13px;
	}
</style>
