import { describe, expect, it, vi } from "vitest";
import { Node, defineSource } from "@quirekit/msfe-core";
import { MarkdownStream, parseMarkdown, MarkdownRenderer, createMarkdownReading, type MarkdownAdapter } from "../index";

const reading = createMarkdownReading<string>();
const adapter: MarkdownAdapter<string> = {
  reading, text: value => value, fragment: children => children.join(""),
  element: (_components, _node, tag, attributes, children) => `<${tag}${attributes?.href ? ` href="${attributes.href}"` : ""}>${children ?? ""}</${tag}>`,
  fallback: source => source, source: (_node, code) => code,
  container: (_node, _attributes, children) => children,
  task: (_node, checked) => String(checked), preview: (_node, inputs) => inputs.source,
  contribution: input => input.source(), block: (_node, output) => output,
};

describe("committed projection ownership", () => {
  it("does not mutate the accepted cache until a frame commits", () => {
    const renderer = new MarkdownRenderer(adapter), state = parseMarkdown("first\n\nsecond");
    const initial = renderer.prepare(state, "en");
    expect(renderer.work.cachedBlocks).toBe(0);
    expect(initial.work.cachedBlocks).toBe(2);
    expect(initial.commit()).toBe(true);
    const update = renderer.prepare(state, "en");
    expect(update.work.reusedBlocks).toBe(2);
    expect(renderer.work.reusedBlocks).toBe(0);
    expect(update.commit()).toBe(true);
    expect(renderer.work.reusedBlocks).toBe(2);
  });

  it("rejects abandoned frames after a newer commit or explicit clear", () => {
    const renderer = new MarkdownRenderer(adapter);
    const old = renderer.prepare(parseMarkdown("old"), "en");
    const current = renderer.prepare(parseMarkdown("current"), "en");
    expect(current.commit()).toBe(true);
    expect(old.commit()).toBe(false);
    const stale = renderer.prepare(parseMarkdown("stale"), "en");
    renderer.clear();
    expect(stale.commit()).toBe(false);
    expect(renderer.work.cachedBlocks).toBe(0);
  });

  it("reprojects old references when a definition arrives in another block", () => {
    const stream = new MarkdownStream(), renderer = new MarkdownRenderer(adapter);
    stream.update("[link][later]\n\nTail"); stream.advance(Number.MAX_SAFE_INTEGER);
    expect(renderer.render(stream.state, "en")).not.toContain('href="https://example.com"');
    stream.append("\n\n[later]: https://example.com"); stream.advance(Number.MAX_SAFE_INTEGER);
    expect(renderer.render(stream.state, "en")).toContain('href="https://example.com"');
  });

  it("reports speculative errors only when their frame is accepted", () => {
    const renderer = new MarkdownRenderer(adapter), report = vi.fn();
    const options = { renderNode: () => { throw new Error("consumer failed"); } };
    const old = renderer.prepare(parseMarkdown("old"), "en", "test", report, options);
    expect(report).not.toHaveBeenCalled();
    renderer.clear(); expect(old.commit()).toBe(false); expect(report).not.toHaveBeenCalled();
    const current = renderer.prepare(parseMarkdown("current"), "en", "test", report, options);
    expect(report).not.toHaveBeenCalled(); expect(current.commit()).toBe(true);
    expect(report).toHaveBeenCalled(); expect(report.mock.calls[0]?.[0].phase).toBe("render");
  });

  it("keeps presentations isolated when two output families share the same source codec", () => {
    const other = createMarkdownReading<string>();
    const badge = Node.create({ name: "badge", addAttributes: () => ({ value: {} }),
      addSource: () => defineSource<{ value: string }>({ nodes: ["Badge"], syntax: { name: "Badge", open: "[[", close: "]]" },
        read: (document, node) => ({ value: document.slice(node.from + 2, node.to - 2) }), patch: () => null }),
    });
    const state = parseMarkdown("[[ok]]", { extensions: [other.withReading(reading.withReading(badge, { render: () => "first" }), { render: () => "second" })] });
    const first = new MarkdownRenderer({ ...adapter, contribution: input => String(input.contribution.definition.render(input.context, undefined)) });
    const second = new MarkdownRenderer({ ...adapter, reading: other, contribution: input => String(input.contribution.definition.render(input.context, undefined)) });
    expect(first.render(state, "en")).toContain("first"); expect(first.render(state, "en")).not.toContain("second");
    expect(second.render(state, "en")).toContain("second");
  });
});
