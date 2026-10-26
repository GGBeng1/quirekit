import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { Mark, Node, defineSource, type AnyExtension } from "@quirekit/msfe-core";
import { renderMdProse } from "../render";
import { withMdReading } from "./extension";
import { readingState } from "./fixtures";

/** @param features - Ordered installed contributions. @param source - Exact Markdown. @param report - Failure observer. @returns Rendered HTML with SSR hydration markers omitted. */
async function render(features: readonly AnyExtension[], source: string, report = vi.fn()): Promise<string> {
  const resolved = features.map(feature => "resolve" in feature ? feature.resolve(() => { throw Error("no editor"); }) : feature);
  const state = readingState({ id: "reading-fixture", extensions: resolved.map(feature => feature.extensions ?? []) }, source);
  return (await renderToString(createSSRApp({ render: () => renderMdProse(state, "en", "fixture", report) }))).replace(/<!--.*?-->/gu, "");
}

const Emphasis = Mark.create({ name: "consumer-emphasis",
  /** @returns Semantics on existing Markdown syntax without declaring a second grammar. */
  addSource() { return defineSource({ nodes: ["Emphasis"], read: () => ({}), patch: () => null }); },
});

describe("reading contribution routing", () => {
  it("tries candidates in installation order and retains built-in nodes when no codec claims them", async () => {
    const skip = withMdReading(Emphasis.extend({ name: "skip", addSource() {
      return defineSource({ nodes: ["Emphasis"], read: () => null, patch: () => null });
    } }), { render: () => "unreachable" });
    const first = withMdReading(Emphasis, { render: context => h("b", context.renderInline()) });
    const last = withMdReading(Emphasis.extend({ name: "last" }), { render: () => "wrong-owner" });
    expect(await render([skip, first, last], "*hello* **world**")).toBe("<p><b>hello</b> <strong>world</strong></p>");
    expect(await render([skip], "*hello*")).toBe("<p><em>hello</em></p>");
  });

  it("renders nested block/inline content through the same installed registry", async () => {
    const Quote = Node.create({ name: "consumer-quote", addSource() {
      return defineSource({ nodes: ["Blockquote"], read: () => ({}), patch: () => null });
    } });
    expect(await render([
      withMdReading(Quote, { render: context => h("aside", context.renderBlocks(["QuoteMark"])) }),
      withMdReading(Emphasis, { render: context => h("b", context.renderInline()) }),
    ], "> *nested* **bold**")).toBe("<aside><p><b>nested</b> <strong>bold</strong></p></aside>");
  });

  it("does not leak child content outside a requested inline range", async () => {
    const errors = vi.fn();
    const html = await render([withMdReading(Emphasis, {
      render: context => h("b", context.renderInline(context.node.from + 4, context.node.to - 1)),
    })], "***inside***", errors);
    expect(html).toContain("***inside***");
    expect(errors).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ phase: "render", cause: expect.any(RangeError) }));
  });

  it("isolates codec failure and escapes source rather than executing it", async () => {
    const errors = vi.fn(), failure = new Error("decode-failed");
    const Broken = Emphasis.extend({ addSource() {
      return defineSource({ nodes: ["Emphasis"], read: () => { throw failure; }, patch: () => null });
    } });
    const html = await render([withMdReading(Broken, { render: () => "unreachable" })], "*<script>alert(1)</script>*\n\n**after**", errors);
    expect(html).toContain("*&lt;script&gt;alert(1)&lt;/script&gt;*");
    expect(html).toContain("<strong>after</strong>");
    expect(errors).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ phase: "read", cause: failure }));
  });

  it("distinguishes explicit empty output from declined presentation and rejects duplicate owners", async () => {
    expect(await render([withMdReading(Emphasis, { render: () => undefined })], "*source*")).toContain("*source*");
    expect(await render([withMdReading(Emphasis, { render: () => null })], "*source*")).toBe("<p></p>");
    const feature = withMdReading(Emphasis, { render: () => "value" });
    await expect(render([feature, feature], "*source*")).rejects.toThrow("duplicate-reading-owner");
  });
});
