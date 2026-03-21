<script lang="ts">
	import { getMoodEmoji, getMoodLabel } from '$lib/entries';
	import { triggerHaptic } from '$lib/haptics';

	let { value = $bindable(7) }: { value: number } = $props();

	let track: HTMLDivElement | undefined = $state();
	let dragging = $state(false);
	let lastHapticValue = $state(value);

	const moods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

	function getMoodColor(mood: number): string {
		if (mood >= 9) return '#34c759';
		if (mood >= 7) return '#30b0ff';
		if (mood >= 5) return '#ff9f0a';
		if (mood >= 3) return '#ff6030';
		return '#ff453a';
	}

	function getMoodBg(mood: number): string {
		if (mood >= 9) return 'rgba(52, 199, 89, 0.12)';
		if (mood >= 7) return 'rgba(48, 176, 255, 0.12)';
		if (mood >= 5) return 'rgba(255, 159, 10, 0.12)';
		if (mood >= 3) return 'rgba(255, 96, 48, 0.12)';
		return 'rgba(255, 69, 58, 0.12)';
	}

	function updateFromPosition(clientX: number) {
		if (!track) return;
		const rect = track.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		const nextValue = Math.round(ratio * 9 + 1);
		if (nextValue !== value) {
			value = nextValue;
			if (nextValue !== lastHapticValue) {
				triggerHaptic('selection');
				lastHapticValue = nextValue;
			}
		}
	}

	function onPointerDown(e: PointerEvent) {
		dragging = true;
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
		updateFromPosition(e.clientX);
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		updateFromPosition(e.clientX);
	}

	function onPointerUp() {
		dragging = false;
		lastHapticValue = value;
	}

	const thumbPercent = $derived(((value - 1) / 9) * 100);
	const activeColor = $derived(getMoodColor(value));
</script>

<div class="mood-selector">
	<!-- Mood display card -->
	<div class="mood-display" style="background: {getMoodBg(value)}">
		<span class="mood-emoji">{getMoodEmoji(value)}</span>
		<div class="mood-info">
			<span class="mood-label" style="color: {activeColor}">{getMoodLabel(value)}</span>
			<span class="mood-score">{value} / 10</span>
		</div>
	</div>

	<!-- Slider -->
	<div
		class="slider-container"
		bind:this={track}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
		role="slider"
		aria-valuemin={1}
		aria-valuemax={10}
		aria-valuenow={value}
		aria-label="Mood"
		tabindex="0"
	>
		<!-- Track background -->
		<div class="track-bg"></div>

		<!-- Filled portion -->
		<div
			class="track-fill"
			style="width: {thumbPercent}%; background: {activeColor}"
		></div>

		<!-- Step dots -->
		<div class="step-dots">
			{#each moods as m}
				{@const pos = ((m - 1) / 9) * 100}
				<div
					class="step-dot"
					class:active={m <= value}
					style="left: {pos}%; {m <= value ? `background: ${activeColor}` : ''}"
				></div>
			{/each}
		</div>

		<!-- Thumb -->
		<div
			class="thumb"
			class:dragging
			style="left: {thumbPercent}%; background: {activeColor}; box-shadow: 0 0 0 4px {getMoodBg(value)}, 0 2px 8px rgba(0,0,0,0.12)"
		></div>
	</div>

	<!-- Scale labels -->
	<div class="scale-labels">
		<span>Rough</span>
		<span>Wonderful</span>
	</div>
</div>

<style>
	.mood-selector {
		padding: 4px 0;
	}

	/* Mood display card */
	.mood-display {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 18px;
		border-radius: 14px;
		margin-bottom: 20px;
		transition: background-color 0.25s ease;
	}

	.mood-emoji {
		font-size: 36px;
		line-height: 1;
		transition: transform 0.2s ease;
	}

	.mood-info {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.mood-label {
		font-size: 17px;
		font-weight: 600;
		letter-spacing: -0.2px;
		transition: color 0.25s ease;
	}

	.mood-score {
		font-size: 13px;
		color: var(--muted);
	}

	/* Slider */
	.slider-container {
		position: relative;
		height: 40px;
		display: flex;
		align-items: center;
		cursor: pointer;
		touch-action: none;
		padding: 0 2px;
	}

	.track-bg {
		position: absolute;
		left: 0;
		right: 0;
		height: 6px;
		border-radius: 100px;
		background: var(--active-bg);
	}

	.track-fill {
		position: absolute;
		left: 0;
		height: 6px;
		border-radius: 100px;
		transition:
			width 0.08s ease-out,
			background-color 0.25s ease;
	}

	/* Step dots */
	.step-dots {
		position: absolute;
		left: 0;
		right: 0;
		height: 6px;
	}

	.step-dot {
		position: absolute;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		background: var(--divider);
		transition:
			background-color 0.15s ease,
			transform 0.15s ease;
	}

	.step-dot.active {
		transform: translate(-50%, -50%) scale(1);
	}

	/* Thumb */
	.thumb {
		position: absolute;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		transform: translateX(-50%);
		transition:
			left 0.08s ease-out,
			background-color 0.25s ease,
			box-shadow 0.25s ease,
			transform 0.15s ease;
		z-index: 1;
	}

	.thumb:hover,
	.thumb.dragging {
		transform: translateX(-50%) scale(1.15);
	}

	/* Scale labels */
	.scale-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 8px;
		padding: 0 2px;
	}

	.scale-labels span {
		font-size: 11px;
		color: var(--muted);
		letter-spacing: 0.1px;
	}
</style>
