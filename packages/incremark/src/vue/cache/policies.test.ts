import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h, type VNodeChild } from "vue";
import { renderToString } from "vue/server-renderer";
import { Node, defineSource } from "@quirekit/msfe-core";
import { ensureSyntaxTree, syntaxTree } from "@quirekit/cm-language";
import { MarkdownStream } from "../../parse/session";
import { withMarkdownReading } from "../contributions/extension";
import { renderMarkdown } from "../rendering/render";
import { MarkdownRenderer } from "./renderer";

const padding = "Stable **paragraph**.\n\n".repeat(40);
/** @param content - Initial source. @returns A completed incremental session. */
function session(content = `${padding}Tail`): MarkdownStream { const result = new MarkdownStream(); result.append(content); result.advance(1e6); return result; }
/** @param output - Vue projection. @returns Semantic HTML. */
async function html(output: VNodeChild): Promise<string> { return renderToString(createSSRApp({ render: () => h("main", [output]) })); }

describe("block cache policy and coverage", () => {
  it("checks references in deferred custom child helpers, including unsafe destination edits", async () => {
    const Wrapper = Node.create({ name: "paragraph-wrapper", addSource: () => defineSource({ nodes: ["Paragraph"], read: () => ({}), patch: () => null }) });
    const stream = new MarkdownStream({ extensions: [withMarkdownReading(Wrapper, { cacheKey: () => null,
      render: context => h("p", context.renderInline()),
    })] });
    stream.append(`[link][r]\n\n${padding}[r]: /old\n\nTail`); stream.advance(1e6);
    const renderer = new MarkdownRenderer(), before = stream.state;
    expect(await html(renderer.render(before, "en"))).toContain('href="/old"');
    const from = stream.content.indexOf("/old");
    let after = before.update({ changes: { from, to: from + 4, insert: "javascript:bad()" } }).state;
    ensureSyntaxTree(after, after.doc.length, 1e6); after = after.update({}).state;
    expect(syntaxTree(before).topNode.firstChild!.tree).toBe(syntaxTree(after).topNode.firstChild!.tree);
    const result = await html(renderer.render(after, "en"));
    expect(result).not.toContain("href="); expect(result).toContain("[link][r]");
    expect(result).toBe(await html(renderMarkdown(after, "en")));
  });

  it("invalidates presentation configuration and conservative product adapters", async () => {
    const stream = session(), renderer = new MarkdownRenderer();
    renderer.render(stream.state, "en"); renderer.render(stream.state, "zh-CN"); expect(renderer.work.reusedBlocks).toBe(0);
    const components = { p: "section" };
    expect(await html(renderer.render(stream.state, "en", "new", undefined, { components }))).toContain("<section>");
    components.p = "article";
    expect(await html(renderer.render(stream.state, "en", "new", undefined, { components }))).toContain("<article>");
    expect(renderer.work.reusedBlocks).toBe(0);
    const renderNode = vi.fn(() => undefined), options = { renderNode };
    renderer.render(stream.state, "en", "new", undefined, options); renderer.render(stream.state, "en", "new", undefined, options);
    expect(renderer.work.reusedBlocks).toBe(0);
    const local = { ...options, renderNodeKey: () => null };
    renderer.render(stream.state, "en", "new", undefined, local); renderNode.mockClear();
    renderer.render(stream.state, "en", "new", undefined, local);
    expect(renderer.work.reusedBlocks).toBe(41); expect(renderNode).toHaveBeenCalledTimes(1); // Document dispatch only.
  });

  it("keeps unparsed suffixes exact and invalidates pending semantic results", async () => {
    const stream = new MarkdownStream(), renderer = new MarkdownRenderer();
    stream.append(`[^later] [link][r]\n\n${padding.repeat(500)}[^later]: note\n\n[r]: /safe`);
    expect(stream.pending).toBe(true);
    const pending = renderer.render(stream.state, "en", "test");
    expect(await html(pending)).toBe(await html(renderMarkdown(stream.state, "en", "test")));
    stream.advance(1e6);
    const complete = await html(renderer.render(stream.state, "en", "test"));
    expect(complete).toContain('href="/safe"'); expect(complete).toContain('aria-label="Footnote 1"');
    expect(complete).toBe(await html(renderMarkdown(stream.state, "en", "test")));
  });

  it("does not let another block's undeclared custom reader poison stable blocks", () => {
    const Badge = Node.create({ name: "badge", addSource: () => defineSource({ nodes: ["Badge"], syntax: { name: "Badge", open: "[[", close: "]]" }, read: () => ({}), patch: () => null }) });
    const stream = new MarkdownStream({ extensions: [withMarkdownReading(Badge, { render: () => h("b", "custom") })] });
    const renderer = new MarkdownRenderer(); stream.append(`${padding}[[ok]]\n\n${padding}Tail`); stream.advance(1e6);
    renderer.render(stream.state, "en"); stream.append(" grows"); stream.advance(1e6); renderer.render(stream.state, "en");
    expect(renderer.work.reusedBlocks).toBe(80); expect(renderer.work.cachedBlocks).toBe(81);
  });

  it("reports broken dependency declarations and continues conservatively", () => {
    const stream = session(), renderer = new MarkdownRenderer(), report = vi.fn();
    const options = { renderNode: () => undefined, renderNodeKey: () => { throw new Error("bad key"); } };
    renderer.render(stream.state, "en", "test", report, options);
    expect(report).toHaveBeenCalledOnce(); expect(renderer.work.cachedBlocks).toBe(0);
  });

  it("does not retain removed VNodes for a later undo", () => {
    const stream = session(), renderer = new MarkdownRenderer(), before = stream.state;
    renderer.render(before, "en"); stream.reset("replacement"); stream.advance(1e6); renderer.render(stream.state, "en");
    renderer.render(before, "en"); expect(renderer.work.reusedBlocks).toBe(0);
  });
});
