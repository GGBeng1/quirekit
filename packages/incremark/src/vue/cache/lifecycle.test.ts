// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";
import { Node, defineSource } from "@quirekit/msfe-core";
import { Compartment, Facet } from "@quirekit/cm-state";
import { MarkdownStream } from "../../parse/session";
import { QuireMarkdown, withMarkdownReading } from "../index";
import { MarkdownRenderer } from "./renderer";

const cleanups: (() => void)[] = [];
afterEach(() => { cleanups.splice(0).forEach(dispose => dispose()); vi.restoreAllMocks(); });
const padding = "Stable **paragraph**.\n\n".repeat(40);
const Badge = Node.create({ name: "badge", addAttributes: () => ({ value: {} }),
  addSource: () => defineSource<{ value: string }>({ nodes: ["Badge"], syntax: { name: "Badge", open: "[[", close: "]]" },
    read: (document, node) => ({ value: document.slice(node.from + 2, node.to - 2) }), patch: () => null }),
});

describe("cached reader component lifetimes", () => {
  it("passes current custom state facets to a product adapter dependency key", async () => {
    const flag = Facet.define<boolean, boolean>({ combine: values => values[0] ?? false }), compartment = new Compartment();
    const stream = new MarkdownStream({ extensions: [{ id: "flag", extensions: compartment.of(flag.of(false)) }] });
    stream.append(`${padding}Tail`); stream.advance(1e6);
    const state = shallowRef(stream.state), root = document.createElement("div");
    const app = createApp({ render: () => h(QuireMarkdown, { state: state.value,
      renderNode: (context, node) => node.name === "Paragraph" ? h("p", { "data-enabled": String(context.state.facet(flag)) }, context.state.sliceDoc(node.from, node.to)) : undefined,
      renderNodeKey: current => current.facet(flag),
    }) });
    app.mount(root); cleanups.push(() => app.unmount()); await nextTick();
    expect(root.querySelector("p")?.getAttribute("data-enabled")).toBe("false");
    state.value = state.value.update({ effects: compartment.reconfigure(flag.of(true)) }).state; await nextTick();
    expect(root.querySelector("p")?.getAttribute("data-enabled")).toBe("true");
  });

  it("skips Vue component render functions in unchanged cached blocks", async () => {
    const renders = new Map<number, number>(), label = shallowRef("");
    const Paragraph = defineComponent({ props: ["node"], setup: (props, { slots }) => () => {
      const from = Number(props.node.from); renders.set(from, (renders.get(from) ?? 0) + 1);
      return h("p", [slots.default?.(), label.value]);
    } });
    const stream = new MarkdownStream(); stream.append(`${padding}Tail`); stream.advance(1e6);
    const state = shallowRef(stream.state), root = document.createElement("div");
    const app = createApp({ render: () => h(QuireMarkdown, { state: state.value, components: { p: Paragraph } }) });
    app.mount(root); cleanups.push(() => app.unmount()); await nextTick();
    for (let i = 0; i < 5; i++) { stream.append(" grows"); stream.advance(1e6); state.value = stream.state; await nextTick(); }
    expect(renders.get(0)).toBe(1); expect(renders.get(padding.length)).toBe(6);
    label.value = "local state"; await nextTick(); expect(renders.get(0)).toBe(2);
  });

  it.each([false, true])("honors explicit local resource reuse %s and document identity", async local => {
    const release = vi.fn(), load = vi.fn(() => ({ value: "owned", release }));
    const revision = shallowRef(0), identity = shallowRef("one");
    const options = { extensions: [withMarkdownReading(Badge, {
      ...(local ? { cacheKey: () => revision.value } : {}), load, render: ({ attrs }) => h("b", String(attrs.value)),
    })] };
    const stream = new MarkdownStream(options); stream.append(`[[ok]]\n\n${padding}Tail`); stream.advance(1e6);
    const state = shallowRef(stream.state), root = document.createElement("div");
    const renderSpy = vi.spyOn(MarkdownRenderer.prototype, "render");
    const app = createApp({ render: () => h(QuireMarkdown, { state: state.value, identity: identity.value }) });
    app.mount(root); cleanups.push(() => app.unmount()); await nextTick();
    expect(load).toHaveBeenCalledTimes(1); const stable = root.querySelector("p");
    for (let i = 0; i < 5; i++) { stream.append(" grows"); stream.advance(1e6); state.value = stream.state; await nextTick(); }
    expect(root.querySelector("p")).toBe(stable);
    expect((renderSpy.mock.contexts.at(-1) as MarkdownRenderer).work.reusedBlocks).toBe(local ? 41 : 40);
    expect(load).toHaveBeenCalledTimes(local ? 1 : 6); expect(release).toHaveBeenCalledTimes(local ? 0 : 5);
    if (local) { revision.value++; await nextTick(); expect(load).toHaveBeenCalledTimes(2); expect(release).toHaveBeenCalledTimes(1); }
    const count = load.mock.calls.length;
    identity.value = "two"; await nextTick(); expect(load).toHaveBeenCalledTimes(count + 1);
    expect(root.querySelector("p")).not.toBe(stable);
    cleanups.pop()!(); await vi.waitFor(() => expect(release).toHaveBeenCalledTimes(load.mock.calls.length));
  });

  it("evaluates a reactive HTML policy after stable block hits", async () => {
    const allowed = shallowRef(true), stream = new MarkdownStream();
    stream.append(`<div><a href="/target">link</a></div>\n\n${padding}Tail`); stream.advance(1e6);
    const state = shallowRef(stream.state), root = document.createElement("div");
    const policy = { allowLink: () => allowed.value };
    const app = createApp({ render: () => h(QuireMarkdown, { state: state.value, html: policy }) });
    app.mount(root); cleanups.push(() => app.unmount()); await nextTick();
    for (let i = 0; i < 3; i++) { stream.append(" grows"); stream.advance(1e6); state.value = stream.state; await nextTick(); }
    expect(root.querySelector('a[href="/target"]')).not.toBeNull();
    allowed.value = false; await nextTick(); expect(root.querySelector('a[href="/target"]')).toBeNull();
    allowed.value = true; await nextTick(); expect(root.querySelector('a[href="/target"]')).not.toBeNull();
  });

  it("isolates cache output across simultaneous reader instances", async () => {
    const stream = new MarkdownStream(); stream.append(`[^note]\n\n${padding}[^note]: body`); stream.advance(1e6);
    const root = document.createElement("div"), app = createApp({ render: () => h("div", [h(QuireMarkdown, { state: stream.state }), h(QuireMarkdown, { state: stream.state })]) });
    app.mount(root); cleanups.push(() => app.unmount()); await nextTick();
    const links = [...root.querySelectorAll("sup a")];
    expect(links).toHaveLength(2); expect(links[0]!.getAttribute("href")).not.toBe(links[1]!.getAttribute("href"));
  });
});
