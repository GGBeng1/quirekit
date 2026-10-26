// @vitest-environment happy-dom
import { act, createElement as h, useState } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { renderToString, renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { QuireMarkdown, MarkdownStream, parseMarkdown, renderMarkdown } from "../index";
import type { QuireMarkdownProps, MarkdownComponents, MarkdownComponentProps } from "../index";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const roots = new Set<Root>();
afterEach(async () => { for (const root of roots) await act(() => root.unmount()); roots.clear(); vi.restoreAllMocks(); });

/** @param props - Accepted initial input. @returns A real React root with a commit helper. */
async function mount(props: QuireMarkdownProps) {
  const dom = document.createElement("div"), root = createRoot(dom); roots.add(root);
  /** @param next - Next committed host input. */
  async function update(next: QuireMarkdownProps): Promise<void> { await act(() => root.render(h(QuireMarkdown, next))); }
  await update(props); return { root, dom, update };
}

/** @param html - Semantic HTML. @returns A comparable tree without React's SSR text separators or instance-specific footnote namespace. */
function canonical(html: string): string {
  return html.replace(/<!--.*?-->/gu, "").replace(/md-_r_\d+_-/gu, "oracle-");
}

it("matches independent complete parsing at every UTF-16 stream prefix", async () => {
  const components = { pre: "pre", img: "img" } as const;
  const content = "[link][late] 🙂\r\n\n[^note] [^note]\n\n`code`\n\n[late]: /first\n[late]: /ignored\n\n[^note]: body [link][late]";
  const reader = await mount({ content: "", components, locale: "en" });
  for (let offset = 1; offset <= content.length; offset++) {
    const prefix = content.slice(0, offset);
    await reader.update({ content: prefix, components, locale: "en", status: "receiving" });
    const oracle = renderToStaticMarkup(h("div", null, renderMarkdown(parseMarkdown(prefix), "en", "oracle", undefined, { components })));
    expect(canonical(reader.dom.firstElementChild!.innerHTML), `prefix ${offset}`).toBe(canonical(oracle.slice(5, -6)));
  }
  expect(reader.dom.querySelector('a[href="/first"]')).not.toBeNull();
  expect(reader.dom.querySelector('a[href="/ignored"]')).toBeNull();
  const anchors = [...reader.dom.querySelectorAll("sup a")];
  expect(anchors).toHaveLength(2); expect(new Set(anchors.map(node => node.id)).size).toBe(2);
  for (const anchor of anchors) expect(reader.dom.querySelector(`[id="${anchor.getAttribute("href")!.slice(1)}"]`)).not.toBeNull();
});

it("updates only the growing paragraph while preserving child local React state", async () => {
  const calls = new Map<number, number>();
  const components: MarkdownComponents = { p: function Paragraph(props: MarkdownComponentProps) {
    const [count, setCount] = useState(0);
    calls.set(props.node.from, (calls.get(props.node.from) ?? 0) + 1);
    return h("p", null, props.children, props.node.from === 0 ? h("button", { onClick: () => setCount(value => value + 1) }, String(count)) : null);
  } };
  let content = "Stable **paragraph**.\n\n".repeat(20) + "Tail";
  const reader = await mount({ content, components }), first = reader.dom.querySelector("p");
  for (let i = 0; i < 5; i++) { content += " grows"; await reader.update({ content, components }); }
  expect(calls.get(0)).toBe(1); expect(calls.get(content.indexOf("Tail"))).toBe(6);
  expect(reader.dom.querySelector("p")).toBe(first);
  await act(() => reader.dom.querySelector("button")!.click());
  expect(reader.dom.querySelector("button")?.textContent).toBe("1"); expect(calls.get(0)).toBe(2);
});

it("status changes do not parse and identity resets the same source's DOM", async () => {
  const update = vi.spyOn(MarkdownStream.prototype, "update");
  const reader = await mount({ content: "Stable", identity: "one", status: "receiving" });
  const initial = update.mock.calls.length, first = reader.dom.querySelector("p");
  await reader.update({ content: "Stable", identity: "one", status: "stopped" });
  expect(update).toHaveBeenCalledTimes(initial); expect(reader.dom.firstElementChild!.getAttribute("data-state")).toBe("stopped");
  expect(reader.dom.querySelector("p")).toBe(first);
  await reader.update({ content: "Stable", identity: "two", status: "complete" });
  expect(reader.dom.querySelector("p")).not.toBe(first);
});

it("supports native/component overrides without leaking node metadata to DOM", async () => {
  const nodes: MarkdownComponentProps["node"][] = [];
  const components: MarkdownComponents = { a: function Link({ node, children, ...attrs }) {
    nodes.push(node); return h("a", { ...attrs, "data-custom-link": "" }, children);
  }, h1: "h2" };
  const reader = await mount({ content: "# Heading\n\n[link](/target)", components });
  expect(reader.dom.querySelector("h2")?.textContent).toBe("Heading");
  expect(reader.dom.querySelector('a[data-custom-link][href="/target"]')).not.toBeNull();
  expect(reader.dom.querySelector("[node]")).toBeNull(); expect(nodes[0]?.type).toBe("Link");
});

it("uses the shared HTML and CSS policy with escaped incomplete islands", async () => {
  const reader = await mount({ content: '<div style="padding: 16px; background: #eef6ff; position: fixed; background-image: url(/load)"><h3>HTML</h3><script>bad()</script><a href="javascript:bad()" onclick="bad()">unsafe</a><img src="javascript:bad()"></div>', html: { styles: "safe" } });
  expect(reader.dom.querySelector("script")).toBeNull(); expect(reader.dom.querySelector("[onclick]")).toBeNull();
  expect(reader.dom.querySelector('a[href^="javascript:"]')).toBeNull(); expect(reader.dom.querySelector('img[src^="javascript:"]')).toBeNull();
  const panel = reader.dom.querySelector("div[style]") as HTMLElement;
  expect(panel.style.padding).toBe("16px"); expect(panel.style.position).toBe(""); expect(panel.style.backgroundImage).toBe("");
  await reader.update({ content: "Text <span>**unfinished", html: true });
  expect(reader.dom.textContent).toContain("<span>");
});

it("preserves ordinary code until a fenced preview has actually closed", async () => {
  const reader = await mount({ content: "```mermaid\ngraph LR\nA-->B" });
  expect(reader.dom.querySelector("pre")?.textContent).toBe("graph LR\nA-->B");
  expect(reader.dom.querySelector(".quire-markdown-preview")).toBeNull();
});

it("rechecks external node dependencies and HTML callbacks even with the same state", async () => {
  let allowed = true;
  const content = '<div><a href="/allowed">link</a></div>', policy = { allowLink: () => allowed };
  const reader = await mount({ content, html: policy });
  expect(reader.dom.querySelector('a[href="/allowed"]')).not.toBeNull();
  allowed = false; await reader.update({ content, html: policy });
  expect(reader.dom.querySelector('a[href="/allowed"]')).toBeNull();
  const state = parseMarkdown("paragraph"), renderNodeKey = () => allowed;
  const renderNode: NonNullable<QuireMarkdownProps["renderNode"]> = (_context, node) => node.name === "Paragraph" ? h("p", null, String(allowed)) : undefined;
  await reader.update({ state, renderNode, renderNodeKey }); expect(reader.dom.textContent).toBe("false");
  allowed = true; await reader.update({ state, renderNode, renderNodeKey }); expect(reader.dom.textContent).toBe("true");
});

it.each(["semantic", "source"] as const)("hydrates %s SSR without recoverable errors", async ssr => {
  const props = { content: "# Heading\n\n[link](/safe)\n\n```ts\nconst value = 1\n```", ssr, locale: "en" as const };
  const html = renderToString(h(QuireMarkdown, props)), dom = document.createElement("div"), onRecoverableError = vi.fn();
  dom.innerHTML = html;
  if (ssr === "source") expect(dom.querySelector("pre")?.textContent).toBe(props.content);
  else expect(dom.querySelector("h1")?.textContent).toBe("Heading");
  await act(() => { roots.add(hydrateRoot(dom, h(QuireMarkdown, props), { onRecoverableError })); });
  expect(onRecoverableError).not.toHaveBeenCalled(); expect(dom.querySelector('a[href="/safe"]')).not.toBeNull();
  expect(dom.querySelector("pre code")?.textContent).toBe("const value = 1");
});

it("isolates navigation namespaces for two readers in one root", async () => {
  const dom = document.createElement("div"), root = createRoot(dom); roots.add(root);
  await act(() => root.render(h("div", null, h(QuireMarkdown, { content: "[^n]\n\n[^n]: note" }), h(QuireMarkdown, { content: "[^n]\n\n[^n]: note" }))));
  const links = [...dom.querySelectorAll("sup a")];
  expect(links).toHaveLength(2); expect(links[0]!.getAttribute("href")).not.toBe(links[1]!.getAttribute("href"));
});

it("falls back to the exact host source for conflicting inputs and recovers", async () => {
  const onError = vi.fn(), reader = await mount({ content: "exact source", state: parseMarkdown("other"), onError });
  expect(reader.dom.textContent).toBe("exact source"); expect(onError.mock.calls[0]?.[0].phase).toBe("parse");
  await reader.update({ content: "# recovered", onError }); expect(reader.dom.querySelector("h1")?.textContent).toBe("recovered");
});
