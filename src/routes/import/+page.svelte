<script lang="ts">
	import { goto } from '$app/navigation';
	import { importJournalEntries } from '$lib/journal';
	import { parseScribeMarkdown } from '$lib/journal-import';

	const template = `# Scribe Export

Generated: [TIMESTAMP]

## [DAY OF WEEK], [MONTH] [DATE], [YEAR]

- Date: [DAY OF WEEK], [MONTH] [DATE], [YEAR]
- Mood: [RATING]/10

[ENTRY BODY PLACEHOLDER]

## [DAY OF WEEK], [MONTH] [DATE], [YEAR]

- Date: [DAY OF WEEK], [MONTH] [DATE], [YEAR]
- Mood: [RATING]/10

[ENTRY BODY PLACEHOLDER]`;

	let markdown = $state('');
	let isImporting = $state(false);
	let errorMessage = $state('');
	let successMessage = $state('');

	async function importMarkdown() {
		errorMessage = '';
		successMessage = '';
		isImporting = true;

		try {
			const parsed = parseScribeMarkdown(markdown);
			if (parsed.length === 0) {
				throw new Error('No entries found in the markdown.');
			}

			const imported = await importJournalEntries(parsed);
			successMessage = `Imported ${imported.length} ${imported.length === 1 ? 'entry' : 'entries'}.`;
			if (imported[0]) {
				await goto(`/entry/${imported[0].id}`);
			}
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Import failed.';
		} finally {
			isImporting = false;
		}
	}

	async function loadFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		markdown = await file.text();
		errorMessage = '';
		successMessage = '';
	}
</script>

<div class="import-page">
	<header class="import-header">
		<div>
			<h1>Import Markdown</h1>
			<p>Paste a `Scribe Export` markdown file or upload one. Entries stay local in IndexedDB.</p>
		</div>
	</header>

	<section class="import-panel">
		<div class="toolbar">
			<label class="file-button">
				<input type="file" accept=".md,text/markdown,text/plain" onchange={loadFile} />
				<span>Upload Markdown</span>
			</label>
			<button class="import-button" onclick={importMarkdown} disabled={isImporting}>
				{isImporting ? 'Importing...' : 'Import Entries'}
			</button>
		</div>

		<textarea
			bind:value={markdown}
			class="markdown-input"
			placeholder={template}
			spellcheck="false"
		></textarea>

		{#if errorMessage}
			<p class="status error">{errorMessage}</p>
		{/if}

		{#if successMessage}
			<p class="status success">{successMessage}</p>
		{/if}
	</section>

	<section class="template-panel">
		<h2>Expected Template</h2>
		<pre>{template}</pre>
	</section>
</div>

<style>
	.import-page {
		max-width: 920px;
		margin: 0 auto;
		padding: 40px 48px;
	}

	.import-header {
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

	.import-header p {
		margin: 0;
		max-width: 640px;
		color: var(--muted);
		line-height: 1.6;
	}

	.import-panel,
	.template-panel {
		padding: 22px;
		border-radius: 22px;
		background: color-mix(in srgb, var(--surface) 92%, white);
		border: 0.5px solid var(--divider);
		box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
	}

	.import-panel {
		margin-bottom: 24px;
	}

	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 16px;
	}

	.file-button,
	.import-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 38px;
		padding: 0 16px;
		border-radius: 999px;
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
		cursor: default;
	}

	.file-button {
		position: relative;
		overflow: hidden;
		border: 0.5px solid var(--divider);
		background: var(--surface);
		color: var(--foreground);
	}

	.file-button input {
		position: absolute;
		inset: 0;
		opacity: 0;
	}

	.import-button {
		border: none;
		background: var(--accent);
		color: white;
	}

	.import-button:disabled {
		opacity: 0.7;
	}

	.markdown-input {
		width: 100%;
		min-height: 380px;
		padding: 18px;
		border-radius: 18px;
		border: 0.5px solid var(--divider);
		background: color-mix(in srgb, var(--background) 78%, white);
		font: 14px/1.6 'SF Mono', 'Monaco', 'Menlo', monospace;
		color: var(--foreground);
		resize: vertical;
		outline: none;
	}

	.markdown-input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
	}

	.status {
		margin: 14px 0 0;
		padding: 12px 14px;
		border-radius: 14px;
		font-size: 13px;
	}

	.status.error {
		background: rgba(239, 68, 68, 0.08);
		color: #b91c1c;
	}

	.status.success {
		background: rgba(34, 197, 94, 0.08);
		color: #166534;
	}

	.template-panel h2 {
		margin: 0 0 14px;
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--muted);
	}

	pre {
		margin: 0;
		white-space: pre-wrap;
		word-break: break-word;
		font: 13px/1.7 'SF Mono', 'Monaco', 'Menlo', monospace;
		color: var(--foreground);
	}
 </style>
