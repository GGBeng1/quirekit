import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { Extension } from "@quirekit/msfe-core";
import { renderMdProse } from "../render";
import { withMdReading } from "./extension";
import { Status, readingState } from "./fixtures";

describe("extension-owned reading", () => {
  it("reuses validation/defaults and leaves unknown, unclosed and code tokens intact", async () => {
    const feature = withMdReading(Status, { render: ({ attrs }) => h("b", `${attrs.label}:${attrs.value}`) });
    const state = readingState(feature, "[[todo]] [[invalid]] `[[done]]` [[unfinished");
    const html = await renderToString(createSSRApp({ render: () => renderMdProse(state, "en") }));
    expect(html).toContain("<b>status:todo</b>"); expect(html).toContain("[[invalid]]");
    expect(html).toContain("<code>[[done]]</code>"); expect(html).toContain("[[unfinished");
    expect(state.doc.toString()).toBe("[[todo]] [[invalid]] `[[done]]` [[unfinished");
  });

  it("reports renderer failures locally and preserves escaped original source", async () => {
    const onError = vi.fn(), failure = new Error("consumer-render-failed");
    const feature = withMdReading(Status, { render: () => { throw failure; } });
    const state = readingState(feature, "**before** [[todo]] **after**");
    const html = await renderToString(createSSRApp({ render: () => renderMdProse(state, "en", "test", onError) }));
    expect(html).toContain("[[todo]]"); expect(html.replace(/<!--.*?-->/gu, "")).toContain("<strong>after</strong>");
    expect(onError).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ owner: "consumer-status", phase: "render", cause: failure }));
  });

  it("does not start resource IO during SSR", async () => {
    const load = vi.fn(() => ({ value: "loaded" }));
    const state = readingState(withMdReading(Status, { load, render: (_context, resource) => h("b", resource) }));
    const html = await renderToString(createSSRApp({ render: () => renderMdProse(state, "en") }));
    expect(html).toContain("[[todo]]"); expect(load).not.toHaveBeenCalled();
  });

  it("rejects missing semantics before mounting and preserves the original definition", () => {
    const adapter = withMdReading(Extension.create({ name: "no-source" }), { render: () => "value" });
    expect(() => readingState(adapter)).toThrow("reading-without-source: no-source");
    const original = Status.resolve(() => { throw Error("no editor"); });
    expect(original.extensions).toEqual(expect.any(Array));
    const read = vi.fn(original.source!.codec.read);
    const descriptor = { ...original, source: { ...original.source!, codec: { ...original.source!.codec, read } } };
    const state = readingState(withMdReading(descriptor, { render: ({ attrs }) => String(attrs.value) }));
    renderMdProse(state, "en"); expect(read).toHaveBeenCalledTimes(1);
  });
});
