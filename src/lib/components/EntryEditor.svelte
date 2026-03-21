<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import StarterKit from '@tiptap/starter-kit';
	import { Editor } from '@tiptap/core';
	import Underline from '@tiptap/extension-underline';
	import Placeholder from '@tiptap/extension-placeholder';
	import {
		TextB,
		TextItalic,
		TextUnderline,
		TextStrikethrough,
		ListBullets,
		ListNumbers,
		Quotes,
		ArrowCounterClockwise,
		ArrowClockwise,
		FloppyDisk
	} from 'phosphor-svelte';
	import MoodSlider from '$lib/components/MoodSlider.svelte';

	let {
		dateLabel,
		initialBody = '',
		initialMood = 7,
		saveLabel = 'Save',
		isSaving = false,
		onSave
	}: {
		dateLabel: string;
		initialBody?: string;
		initialMood?: number;
		saveLabel?: string;
		isSaving?: boolean;
		onSave: (payload: { body: string; mood: number }) => Promise<void> | void;
	} = $props();

	let editorElement: HTMLDivElement | undefined = $state();
	let editor: Editor | undefined = $state();
	let mood = $state(7);

	$effect(() => {
		mood = initialMood;
	});

	onMount(() => {
		if (!editorElement) return;

		editor = new Editor({
			element: editorElement,
			content: initialBody,
			extensions: [
				StarterKit,
				Underline,
				Placeholder.configure({
					placeholder: 'How was your day?'
				})
			],
			editorProps: {
				attributes: {
					class: 'tiptap-editor'
				}
			}
		});
	});

	onDestroy(() => {
		editor?.destroy();
	});

	function toggleBold() { editor?.chain().focus().toggleBold().run(); }
	function toggleItalic() { editor?.chain().focus().toggleItalic().run(); }
	function toggleUnderline() { editor?.chain().focus().toggleUnderline().run(); }
	function toggleStrike() { editor?.chain().focus().toggleStrike().run(); }
	function toggleBulletList() { editor?.chain().focus().toggleBulletList().run(); }
	function toggleOrderedList() { editor?.chain().focus().toggleOrderedList().run(); }
	function toggleBlockquote() { editor?.chain().focus().toggleBlockquote().run(); }
	function undo() { editor?.chain().focus().undo().run(); }
	function redo() { editor?.chain().focus().redo().run(); }

	async function saveEntry() {
		await onSave({
			body: editor?.getHTML().trim() ?? '',
			mood
		});
	}
</script>

<div class="editor-page">
	<div class="toolbar">
		<div class="toolbar-group">
			<button class="toolbar-btn" class:active={editor?.isActive('bold')} onclick={toggleBold} title="Bold">
				<TextB size={18} weight="bold" />
			</button>
			<button class="toolbar-btn" class:active={editor?.isActive('italic')} onclick={toggleItalic} title="Italic">
				<TextItalic size={18} weight="bold" />
			</button>
			<button class="toolbar-btn" class:active={editor?.isActive('underline')} onclick={toggleUnderline} title="Underline">
				<TextUnderline size={18} weight="bold" />
			</button>
			<button class="toolbar-btn" class:active={editor?.isActive('strike')} onclick={toggleStrike} title="Strikethrough">
				<TextStrikethrough size={18} weight="bold" />
			</button>
			<span class="toolbar-divider"></span>
			<button class="toolbar-btn" class:active={editor?.isActive('bulletList')} onclick={toggleBulletList} title="Bullet list">
				<ListBullets size={18} weight="bold" />
			</button>
			<button class="toolbar-btn" class:active={editor?.isActive('orderedList')} onclick={toggleOrderedList} title="Numbered list">
				<ListNumbers size={18} weight="bold" />
			</button>
			<button class="toolbar-btn" class:active={editor?.isActive('blockquote')} onclick={toggleBlockquote} title="Quote">
				<Quotes size={18} weight="bold" />
			</button>
			<span class="toolbar-divider"></span>
			<button class="toolbar-btn" onclick={undo} title="Undo">
				<ArrowCounterClockwise size={18} weight="bold" />
			</button>
			<button class="toolbar-btn" onclick={redo} title="Redo">
				<ArrowClockwise size={18} weight="bold" />
			</button>
		</div>

		<div class="toolbar-right">
			<button class="save-btn" onclick={saveEntry} disabled={isSaving}>
				<FloppyDisk size={16} weight="fill" />
				<span>{isSaving ? 'Saving...' : saveLabel}</span>
			</button>
		</div>
	</div>

	<div class="editor-content">
		<h1 class="editor-date">{dateLabel}</h1>
		<MoodSlider bind:value={mood} />
		<div class="editor-area" bind:this={editorElement}></div>
	</div>
</div>

<style>
	.editor-page {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 16px;
		border-bottom: 0.5px solid var(--divider);
		flex-shrink: 0;
		gap: 8px;
	}

	.toolbar-group {
		display: flex;
		align-items: center;
		gap: 1px;
	}

	.toolbar-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 28px;
		border-radius: 5px;
		border: none;
		background: transparent;
		color: var(--foreground);
		cursor: default;
		transition:
			background-color 0.1s,
			color 0.1s;
		opacity: 0.7;
	}

	.toolbar-btn:hover {
		opacity: 1;
		background: var(--hover-bg);
	}

	.toolbar-btn.active {
		opacity: 1;
		background: var(--active-bg);
		color: var(--accent);
	}

	.toolbar-divider {
		width: 1px;
		height: 18px;
		background: var(--divider);
		margin: 0 6px;
	}

	.toolbar-right {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-shrink: 0;
	}

	.save-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		height: 28px;
		padding: 0 14px;
		border-radius: 100px;
		border: none;
		background: var(--accent);
		color: #ffffff;
		font-size: 13px;
		font-weight: 500;
		font-family: inherit;
		cursor: default;
		transition:
			filter 0.15s,
			transform 0.1s;
		box-shadow: 0 0.5px 2px rgba(0, 0, 0, 0.12);
	}

	.save-btn:hover {
		filter: brightness(1.08);
	}

	.save-btn:active {
		transform: scale(0.96);
	}

	.save-btn:disabled {
		opacity: 0.72;
	}

	.editor-content {
		flex: 1;
		overflow-y: auto;
		padding: 40px 48px;
		max-width: 720px;
	}

	.editor-date {
		font-family: 'Instrument Serif', 'Georgia', serif;
		font-size: 36px;
		font-weight: 400;
		color: var(--foreground);
		line-height: 1.15;
		letter-spacing: -0.3px;
		margin-bottom: 20px;
	}

	.editor-area {
		min-height: 320px;
		font-size: 15px;
		line-height: 1.7;
		color: var(--foreground);
		padding-bottom: 48px;
	}

	.editor-area :global(.tiptap-editor) {
		outline: none;
		min-height: 320px;
	}

	.editor-area :global(p) {
		margin-bottom: 16px;
	}

	.editor-area :global(p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: var(--muted);
		pointer-events: none;
		height: 0;
	}

	.editor-area :global(ul) {
		padding-left: 24px;
		margin-bottom: 16px;
		list-style-type: disc;
	}

	.editor-area :global(ol) {
		padding-left: 24px;
		margin-bottom: 16px;
		list-style-type: decimal;
	}

	.editor-area :global(li) {
		margin-bottom: 4px;
		display: list-item;
	}

	.editor-area :global(blockquote) {
		border-left: 3px solid var(--accent);
		padding-left: 16px;
		margin-left: 0;
		margin-bottom: 16px;
		color: var(--muted);
		font-style: italic;
	}

	/* Mobile */
	@media (max-width: 768px) {
		.toolbar {
			padding: 6px 12px;
			overflow-x: auto;
			scrollbar-width: none;
			-webkit-overflow-scrolling: touch;
		}

		.toolbar::-webkit-scrollbar {
			display: none;
		}

		.toolbar-group {
			flex-shrink: 0;
		}

		.toolbar-btn {
			width: 36px;
			height: 34px;
			-webkit-tap-highlight-color: transparent;
		}

		.save-btn {
			height: 34px;
			padding: 0 16px;
			font-size: 14px;
		}

		.editor-content {
			padding: 24px 20px;
		}

		.editor-date {
			font-size: 28px;
			margin-bottom: 16px;
		}

		.editor-area {
			font-size: 16px;
			min-height: 200px;
			padding-bottom: 80px;
		}

		.editor-area :global(.tiptap-editor) {
			min-height: 200px;
		}
	}
 </style>
