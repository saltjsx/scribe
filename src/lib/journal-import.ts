function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function formatInlineMarkdown(line: string): string {
	return escapeHtml(line)
		.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
		.replace(/\*(.+?)\*/g, '<em>$1</em>')
		.replace(/`(.+?)`/g, '<code>$1</code>');
}

function markdownBodyToHtml(markdown: string): string {
	const lines = markdown.trim().split('\n');
	const parts: string[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index].trim();

		if (!line) {
			index += 1;
			continue;
		}

		if (line.startsWith('- ')) {
			const items: string[] = [];
			while (index < lines.length && lines[index].trim().startsWith('- ')) {
				items.push(`<li>${formatInlineMarkdown(lines[index].trim().slice(2))}</li>`);
				index += 1;
			}
			parts.push(`<ul>${items.join('')}</ul>`);
			continue;
		}

		if (/^\d+\.\s/.test(line)) {
			const items: string[] = [];
			while (index < lines.length && /^\d+\.\s/.test(lines[index].trim())) {
				items.push(
					`<li>${formatInlineMarkdown(lines[index].trim().replace(/^\d+\.\s/, ''))}</li>`
				);
				index += 1;
			}
			parts.push(`<ol>${items.join('')}</ol>`);
			continue;
		}

		if (line.startsWith('> ')) {
			const quoteLines: string[] = [];
			while (index < lines.length && lines[index].trim().startsWith('> ')) {
				quoteLines.push(formatInlineMarkdown(lines[index].trim().slice(2)));
				index += 1;
			}
			parts.push(`<blockquote><p>${quoteLines.join('<br>')}</p></blockquote>`);
			continue;
		}

		const paragraphLines: string[] = [];
		while (
			index < lines.length &&
			lines[index].trim() &&
			!lines[index].trim().startsWith('- ') &&
			!lines[index].trim().startsWith('> ') &&
			!/^\d+\.\s/.test(lines[index].trim())
		) {
			paragraphLines.push(formatInlineMarkdown(lines[index].trim()));
			index += 1;
		}
		parts.push(`<p>${paragraphLines.join('<br>')}</p>`);
	}

	return parts.join('\n');
}

export interface ParsedMarkdownEntry {
	date: Date;
	mood: number;
	body: string;
}

export function parseScribeMarkdown(markdown: string): ParsedMarkdownEntry[] {
	const normalized = markdown.replaceAll('\r\n', '\n').trim();
	if (!normalized) return [];

	const sections = normalized
		.split(/^##\s+/m)
		.map((section) => section.trim())
		.filter(Boolean);

	const entries: ParsedMarkdownEntry[] = [];

	for (const section of sections) {
		if (section.startsWith('# Scribe Export')) continue;

		const lines = section.split('\n');
		const heading = lines[0]?.trim() ?? '';
		const dateLine = lines.find((line) => line.startsWith('- Date: '))?.replace('- Date: ', '').trim();
		const moodLine = lines.find((line) => line.startsWith('- Mood: '))?.replace('- Mood: ', '').trim();

		if (!dateLine || !moodLine) {
			throw new Error(`Missing Date or Mood metadata for section "${heading || 'unknown'}".`);
		}

		const moodMatch = moodLine.match(/^(\d{1,2})\/10$/);
		if (!moodMatch) {
			throw new Error(`Invalid mood format in section "${heading || dateLine}".`);
		}

		const parsedDate = new Date(dateLine);
		if (Number.isNaN(parsedDate.getTime())) {
			throw new Error(`Invalid date "${dateLine}" in section "${heading || dateLine}".`);
		}

		const mood = Math.max(1, Math.min(10, Number(moodMatch[1])));
		const bodyStartIndex = lines.findIndex((line) => line.startsWith('- Mood: ')) + 1;
		const bodyMarkdown = lines.slice(bodyStartIndex).join('\n').trim();

		entries.push({
			date: parsedDate,
			mood,
			body: markdownBodyToHtml(bodyMarkdown || '(Imported entry)')
		});
	}

	return entries;
}
