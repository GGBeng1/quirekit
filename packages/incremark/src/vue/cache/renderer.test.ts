import { describe, expect, it } from "vitest";
import { createSSRApp, h, type VNodeChild } from "vue";
import { renderToString } from "vue/server-renderer";
import { ensureSyntaxTree, syntaxTree } from "@quirekit/cm-language";
import { MarkdownStream } from "../../parse/session";
import { parseMarkdown } from "../../parse/complete";
import { renderMarkdown } from "../rendering/render";
import { MarkdownRenderer } from "./renderer";

const padding = Array.from({ length: 20 }, (_, i) => `Paragraph ${i} with **bold**, *emphasis* and local [link](/local).\n\n`).join("");
const options = { components: { pre: "pre", img: "img" } } as const;

/** @param output - Projected reading content. @returns Deterministic semantic HTML. */
async function html(output: VNodeChild): Promise<string> { return renderToString(createSSRApp({ render: () => h("main", [output]) })); }

describe("incremental top-level reading blocks", () => {
  it("reuses native blocks without revisiting their inline nodes", () => {
    const stream = new MarkdownStream(), renderer = new MarkdownRenderer();
    stream.append(`${padding}Tail`); stream.advance(1e6);
    const first = renderer.render(stream.state, "en", "test", undefined, options) as VNodeChild[][];
    const initial = renderer.work;
    expect(initial.dependencyNodes).toBeLessThan(initial.projectedNodes * 2);
    stream.append(" grows"); stream.advance(1e6);
    const second = renderer.render(stream.state, "en", "test", undefined, options) as VNodeChild[][];
    expect(second[0]![0]).toBe(first[0]![0]);
    expect(renderer.work.reusedBlocks).toBe(20);
    expect(renderer.work.projectedNodes).toBeLessThan(5);
    expect(renderer.work.dependencyNodes).toBeLessThan(5);
    expect(initial.projectedNodes).toBeGreaterThan(100);
    renderer.render(stream.state, "en", "test", undefined, { ...options, cache: false });
    expect(renderer.work.reusedBlocks).toBe(0); expect(renderer.work.projectedNodes).toBe(initial.projectedNodes);
  });

  it("invalidates unchanged link syntax when a distant definition changes its value", async () => {
    const before = parseMarkdown(`[link][target]\n\n${padding}[target]: /first "title"\n\nTail`), renderer = new MarkdownRenderer();
    renderer.render(before, "en", "test", undefined, options);
    const at = before.doc.toString().indexOf("/first");
    let after = before.update({ changes: { from: at, to: at + 6, insert: "/other" } }).state;
    ensureSyntaxTree(after, after.doc.length, 1e6); after = after.update({}).state;
    expect(syntaxTree(after).topNode.firstChild!.tree).toBe(syntaxTree(before).topNode.firstChild!.tree);
    const output = await html(renderer.render(after, "en", "test", undefined, options));
    expect(output).toContain('href="/other"'); expect(output).not.toContain('href="/first"');
    expect(output).toBe(await html(renderMarkdown(after, "en", "test", undefined, options)));
    expect(renderer.work.reusedBlocks).toBeGreaterThan(15);
  });

  it("recomputes old footnote numbers and navigation when a missing earlier label is defined", async () => {
    const stream = new MarkdownStream(), renderer = new MarkdownRenderer();
    stream.append(`early [^a] inline ^[note] late [^b]\n\n${padding}[^b]: second\n\n`); stream.advance(1e6);
    const before = await html(renderer.render(stream.state, "en", "test", undefined, options));
    expect(before).toContain('aria-label="Footnote 2"'); expect(before).toContain("[^a]");
    stream.append("[^a]: first\n\nTail"); stream.advance(1e6);
    const after = await html(renderer.render(stream.state, "en", "test", undefined, options));
    expect(after).toContain('aria-label="Footnote 3"'); expect(after).toContain("[2: note");
    expect(after).not.toContain("[^a]");
    expect(after).toBe(await html(renderMarkdown(parseMarkdown(stream.content), "en", "test", undefined, options)));
  });

  it("matches a fresh parse at each stream prefix including late syntax and HTML", async () => {
    const source = `${padding}before <span>[late][r] [^n]</span> 😀\r\n\r\n| a | b |\n| - | - |\n| **x** | y |\n\n- one\n- two\n\n<div><b>safe</b><script>bad()</script></div>\n\n\`\`\`ts\n😀 exact\n\`\`\`\n\n[r]: /target\n\n[^n]: note with [link][r]\n\n[r]: /ignored\n`;
    const stream = new MarkdownStream(), renderer = new MarkdownRenderer();
    const policy = { ...options, html: true };
    for (let offset = 0; offset < source.length; offset += 19) {
      stream.append(source.slice(offset, offset + 19)); stream.advance(1e6);
      const actual = await html(renderer.render(stream.state, "en", "test", undefined, policy));
      const expected = await html(renderMarkdown(parseMarkdown(stream.content), "en", "test", undefined, policy));
      expect(actual, `prefix ${offset + 19}`).toBe(expected);
    }
  });

  it("bounds retention, removes old blocks and clears explicitly", () => {
    const stream = new MarkdownStream(), renderer = new MarkdownRenderer({ maxBlocks: 3, maxSourceUnits: 200 });
    stream.append(`${padding}Tail`); stream.advance(1e6);
    renderer.render(stream.state, "en", "test");
    expect(renderer.work.cachedBlocks).toBeLessThanOrEqual(3); expect(renderer.work.cachedSourceUnits).toBeLessThanOrEqual(200);
    stream.reset("new document"); stream.advance(1e6); renderer.render(stream.state, "en", "test");
    expect(renderer.work.reusedBlocks).toBe(0); expect(renderer.work.cachedBlocks).toBe(1);
    renderer.clear(); expect(renderer.work.cachedBlocks).toBe(0);
  });
});
