import TurndownService from "turndown";
import type { StoredEntry } from "@/lib/entries";

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function convertHtmlToMarkdown(html: string): string {
  return normalizeMarkdown(turndownService.turndown(html));
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
