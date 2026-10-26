import { describe, expect, it } from "vitest";
import { syntaxTree } from "@quirekit/cm-language";
import { createDocumentState } from "../mount/state";

/** Representative categories, not a claim of complete HTML-renderer conformance. */
const cases: readonly [string, string, readonly string[]][] = [
  ["headings", "# Heading\n\nSetext\n---", ["ATXHeading1", "SetextHeading2"]],
  ["inline formatting", "**bold** *italic* `code` ~~strike~~", ["StrongEmphasis", "Emphasis", "InlineCode", "Strikethrough"]],
  ["nested containers", "> quote\n> - nested\n>   1. ordered", ["Blockquote", "BulletList", "OrderedList"]],
  ["task items", "- [x] complete", ["Task", "TaskMarker"]],
  ["tables", "| a | b |\n|---|:---:|\n| 1 | 2 |", ["Table", "TableHeader", "TableRow", "TableCell"]],
  ["code families", "    indented\n\n~~~js\nconst x = 1\n~~~", ["CodeBlock", "FencedCode"]],
  ["links and images", "[link](url 'title') ![alt](image.png)", ["Link", "Image", "LinkTitle"]],
  ["reference syntax", "[label][id]\n\n[id]: /target", ["Link", "LinkReference"]],
  ["escapes and entities", "\\*literal\\* &amp; &#65;", ["Escape", "Entity"]],
  ["hard line break", "first  \nsecond", ["HardBreak"]],
  ["HTML", "<span>text</span>\n\n<div>block</div>", ["HTMLTag", "HTMLBlock"]],
  ["autolinks", "<https://example.com> www.example.com a@example.com", ["Autolink", "URL"]],
];

describe("installed Markdown syntax baseline", () => {
  it.each(cases)("recognizes %s without rewriting source", (_name, source, expected) => {
    const state = createDocumentState(source, []), names = new Set<string>();
    syntaxTree(state).iterate({ enter: node => { names.add(node.name); } });
    for (const name of expected) expect(names.has(name), name).toBe(true);
    expect(state.doc.toString()).toBe(source);
  });
  it("recognizes bare GFM URLs and email while isolating code", () => {
    const source = "www.example.com https://example.com/a(b). a@example.com\n\n`www.code.example`\n\n```\nhttps://code.example\n```";
    const state = createDocumentState(source, []), urls: string[] = [];
    syntaxTree(state).iterate({ enter: node => { if (node.name === "URL") urls.push(state.sliceDoc(node.from, node.to)); } });
    expect(urls).toEqual(["www.example.com", "https://example.com/a(b)", "a@example.com"]);
  });
});
