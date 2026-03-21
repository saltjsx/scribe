import { describe, expect, it } from "vitest";
import { buildAllEntriesMarkdown, convertHtmlToMarkdown } from "@/lib/markdown-export";

describe("markdown export", () => {
  it("converts rich html formatting to markdown", () => {
    const html = [
      "<h2>Daily Notes</h2>",
      "<p><strong>Hello</strong> <em>world</em> and <a href=\"https://example.com\">link</a>.</p>",
      "<ul><li>First</li><li>Second</li></ul>",
      "<blockquote><p>Remember this</p></blockquote>",
      "<pre><code>const x = 1;</code></pre>",
    ].join("");

    const markdown = convertHtmlToMarkdown(html);

    expect(markdown).toContain("## Daily Notes");
    expect(markdown).toContain("**Hello** *world* and [link](https://example.com).");
    expect(markdown).toContain("- First");
    expect(markdown).toContain("- Second");
    expect(markdown).toContain("> Remember this");
    expect(markdown).toContain("```");
    expect(markdown).toContain("const x = 1;");
  });

  it("builds a single markdown export for all entries", () => {
    const markdown = buildAllEntriesMarkdown([
      {
        id: "entry-1",
        date: "Sunday, March 21, 2026",
        dateShort: "Mar 21, 2026",
        mood: 8,
        title: "Sunday, March 21, 2026",
        body: "<p>Line one<br>Line two</p>",
        tags: [],
        updatedAt: "2026-03-21T05:00:00.000Z",
        deletedAt: null,
        deviceId: "device-a",
        lastMutationId: "m1",
      },
    ]);

    expect(markdown).toContain("# Scribe Export");
    expect(markdown).toMatch(/Generated: \d{4}-\d{2}-\d{2}T/);
    expect(markdown).toContain("## Sunday, March 21, 2026");
    expect(markdown).toContain("- Mood: 8/10");
    expect(markdown).toContain("Line one\nLine two");
  });
});

