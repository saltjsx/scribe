<script lang="ts">
	import { Download } from 'phosphor-svelte';
	import { triggerHaptic } from '$lib/haptics';
	import { journalEntries, journalLoaded } from '$lib/journal';
	import { sortEntriesByDate, getMoodLabel } from '$lib/entries';
	import type { Entry } from '$lib/entries';

	function htmlToMarkdown(html: string): string {
		let text = html;
		text = text.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
		text = text.replace(/<b>(.*?)<\/b>/g, '**$1**');
		text = text.replace(/<em>(.*?)<\/em>/g, '*$1*');
		text = text.replace(/<i>(.*?)<\/i>/g, '*$1*');
		text = text.replace(/<u>(.*?)<\/u>/g, '$1');
		text = text.replace(/<code>(.*?)<\/code>/g, '`$1`');
		text = text.replace(/<br\s*\/?>/g, '\n');
		text = text.replace(/<\/p>\s*<p>/g, '\n\n');
		text = text.replace(/<li>(.*?)<\/li>/g, '- $1\n');
		text = text.replace(/<blockquote>(.*?)<\/blockquote>/g, '> $1');
		text = text.replace(/<[^>]+>/g, '');
		text = text.replace(/&amp;/g, '&');
		text = text.replace(/&lt;/g, '<');
		text = text.replace(/&gt;/g, '>');
		text = text.replace(/&quot;/g, '"');
		text = text.replace(/&#39;/g, "'");
		return text.trim();
	}

	function buildMarkdown(entries: Entry[]): string {
		const sorted = sortEntriesByDate(entries);
		const lines: string[] = [
			'# Scribe Export',
			'',
			`Generated: ${new Date().toLocaleString()}`,
			''
		];

		for (const entry of sorted) {
			lines.push(`## ${entry.date}`);
			lines.push('');
			lines.push(`- Date: ${entry.date}`);
			lines.push(`- Mood: ${entry.mood}/10 (${getMoodLabel(entry.mood)})`);
			lines.push('');
			const body = htmlToMarkdown(entry.body);
			if (body) {
				lines.push(body);
				lines.push('');
			}
		}

		return lines.join('\n');
	}

	function downloadMarkdown() {
		triggerHaptic('medium');
		const content = buildMarkdown($journalEntries);
		const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `scribe-export-${new Date().toISOString().slice(0, 10)}.md`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		triggerHaptic('success');
	}

	const preview = $derived(
		$journalLoaded && $journalEntries.length > 0
			? buildMarkdown($journalEntries)
			: ''
	);
</script>

<div class="export-page">
	<header class="export-header">
		<div>
			<h1>Export Entries</h1>
			<p>Download all your journal entries as a markdown file compatible with Scribe Import.</p>
		</div>
	</header>

	{#if !$journalLoaded}
		<p class="status-msg">Loading entries...</p>
	{:else if $journalEntries.length === 0}
		<p class="status-msg">No entries to export. Write your first entry to get started.</p>
	{:else}
		<section class="export-panel">
			<div class="toolbar">
				<span class="entry-count">{$journalEntries.length} {$journalEntries.length === 1 ? 'entry' : 'entries'}</span>
				<button class="download-button" onclick={downloadMarkdown}>
					<Download size={16} weight="bold" />
					<span>Download .md</span>
				</button>
			</div>

			<pre class="preview">{preview}</pre>
		</section>
	{/if}
</div>

<style>
	.export-page {
		max-width: 920px;
		margin: 0 auto;
		padding: 40px 48px;
	}

	.export-header {
		margin-bottom: 28px;
	}

	h1 {
		margin: 0 0 8px;
		font-family: 'Instrument Serif', 'Georgia', serif;
		font-size: 42px;
		font-weight: 400;
		letter-spacing: -0.04em;
		color: var(--foreground);
	}

	.export-header p {
		margin: 0;
		max-width: 640px;
		color: var(--muted);
		line-height: 1.6;
	}

	.status-msg {
		padding: 18px 0;
		font-size: 14px;
		line-height: 1.6;
		color: var(--muted);
	}

	.export-panel {
		padding: 22px;
		border-radius: 22px;
		background: color-mix(in srgb, var(--surface) 92%, white);
		border: 0.5px solid var(--divider);
		box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
	}

	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 16px;
	}

	.entry-count {
		font-size: 13px;
		font-weight: 600;
		color: var(--muted);
	}

	.download-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 38px;
		padding: 0 16px;
		border-radius: 999px;
		border: none;
		background: var(--accent);
		color: white;
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		cursor: default;
		transition:
			filter 0.15s,
			transform 0.1s;
	}

	.download-button:hover {
		filter: brightness(1.08);
	}

	.download-button:active {
		transform: scale(0.97);
	}

	.preview {
		margin: 0;
		max-height: 500px;
		overflow-y: auto;
		padding: 18px;
		border-radius: 18px;
		border: 0.5px solid var(--divider);
		background: color-mix(in srgb, var(--background) 78%, white);
		font: 13px/1.7 'SF Mono', 'Monaco', 'Menlo', monospace;
		color: var(--foreground);
		white-space: pre-wrap;
		word-break: break-word;
	}

	@media (max-width: 768px) {
		.export-page {
			padding: 20px 20px 24px;
		}

		h1 {
			font-size: 34px;
		}

		.preview {
			max-height: 400px;
		}
	}
</style>
