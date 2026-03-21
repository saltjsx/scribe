import type { StoredEntry } from "@/lib/entries";

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, "");
}

function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function convertInlineHtmlToMarkdown(html: string): string {
  return stripTags(
    decodeHtmlEntities(
      html
        .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
        .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, "**$2**")
        .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, "*$2*")
        .replace(/<u>([\s\S]*?)<\/u>/gi, "<ins>$1</ins>")
        .replace(/<(s|strike|del)>([\s\S]*?)<\/\1>/gi, "~~$2~~")
        .replace(/<code>([\s\S]*?)<\/code>/gi, "`$1`")
    )
  );
}

function convertListHtmlToMarkdown(html: string, ordered: boolean): string {
  const itemRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const items: string[] = [];
  let match: RegExpExecArray | null;
  let index = 1;

  while ((match = itemRegex.exec(html)) !== null) {
    const prefix = ordered ? `${index}. ` : "- ";
    const item = convertHtmlToMarkdown(match[1]).replace(/\n/g, "\n  ").trim();
    items.push(`${prefix}${item}`);
    index += 1;
  }

  return `\n${items.join("\n")}\n`;
}

export function convertHtmlToMarkdown(html: string): string {
  const markdown = html
    .replace(/\r\n?/g, "\n")
    .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, (_match, code: string) => `\n\`\`\`\n${decodeHtmlEntities(code).trim()}\n\`\`\`\n`)
    .replace(/<h1>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<h4>([\s\S]*?)<\/h4>/gi, "\n#### $1\n")
    .replace(/<h5>([\s\S]*?)<\/h5>/gi, "\n##### $1\n")
    .replace(/<h6>([\s\S]*?)<\/h6>/gi, "\n###### $1\n")
    .replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (_match, quote: string) => {
      const value = convertHtmlToMarkdown(quote)
        .split("\n")
        .map((line) => (line.trim() ? `> ${line}` : ">"))
        .join("\n");
      return `\n${value}\n`;
    })
    .replace(/<ul>([\s\S]*?)<\/ul>/gi, (_match, list: string) => convertListHtmlToMarkdown(list, false))
    .replace(/<ol>([\s\S]*?)<\/ol>/gi, (_match, list: string) => convertListHtmlToMarkdown(list, true))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<(p|div)>([\s\S]*?)<\/\1>/gi, "\n$2\n");

  return normalizeMarkdown(convertInlineHtmlToMarkdown(markdown));
}

export function buildAllEntriesMarkdown(entries: StoredEntry[]): string {
  const generatedAt = new Date().toISOString();
  const sections = entries.map((entry) => {
    const bodyMarkdown = convertHtmlToMarkdown(entry.body);

    return [
      `## ${entry.title}`,
      `- Date: ${entry.date}`,
      `- Mood: ${entry.mood}/10`,
      "",
      bodyMarkdown || "_No content_",
    ].join("\n");
  });

  return [
    "# Scribe Export",
    `Generated: ${generatedAt}`,
    "",
    ...(sections.length > 0 ? sections : ["_No entries yet._"]),
  ].join("\n\n");
}

