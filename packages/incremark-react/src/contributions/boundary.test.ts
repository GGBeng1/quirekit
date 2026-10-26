// @vitest-environment happy-dom
import { StrictMode, act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { Node, defineSource, TaskScope, type ResourceLease } from "@quirekit/msfe-core";
import { QuireMarkdown, withMarkdownReading } from "../index";
import type { MarkdownReadingDefinition } from "../index";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const roots = new Set<Root>();
afterEach(async () => { for (const root of roots) await act(() => root.unmount()); roots.clear(); vi.restoreAllMocks(); });
const Badge = Node.create({ name: "badge", addAttributes: () => ({ value: { validate: value => value === "ok" } }),
  addSource: () => defineSource<{ value: string }>({ nodes: ["Badge"], syntax: { name: "Badge", open: "[[", close: "]]" },
    read: (document, node) => ({ value: document.slice(node.from + 2, node.to - 2) }), patch: () => null }),
});

it("validates custom syntax and leaves unknown, invalid and unclosed input visible", async () => {
  const options = { extensions: [withMarkdownReading(Badge, { render: ({ attrs }) => h("b", { "data-badge": "" }, String(attrs.value)) })] };
  const dom = document.createElement("div"), root = createRoot(dom); roots.add(root);
  for (const content of ["[[", "[[ok", "[[ok]] [[bad]] `[[ok]]`"]) {
    await act(() => root.render(h(QuireMarkdown, { content, options })));
    expect(dom.querySelectorAll("[data-badge]")).toHaveLength(content.endsWith("`") ? 1 : 0);
  }
  expect(dom.textContent).toBe("ok [[bad]] [[ok]]");
});

it("does not load during SSR and cancels/releases StrictMode's old generations", async () => {
  const acquire = vi.spyOn(TaskScope.prototype, "acquire");
  const jobs: { signal: AbortSignal; resolve: (lease: ResourceLease<string>) => void }[] = [];
  const options = { extensions: [withMarkdownReading(Badge, {
    cacheKey: () => 1,
    load: (_context, signal) => new Promise<ResourceLease<string>>(resolve => jobs.push({ signal, resolve })),
    render: (_context, resource) => h("b", null, resource),
  })] };
  let content = "[[ok]]\n\n" + "Stable paragraph.\n\n".repeat(30) + "Tail";
  const dom = document.createElement("div"), root = createRoot(dom); roots.add(root);
  expect(renderToString(h(QuireMarkdown, { content, options }))).toContain("[[ok]]"); expect(jobs).toHaveLength(0);
  await act(() => root.render(h(StrictMode, null, h(QuireMarkdown, { content, options, identity: "one" }))));
  expect(acquire.mock.calls.length).toBeGreaterThanOrEqual(2);
  expect((acquire.mock.contexts[0] as TaskScope).disposed).toBe(true);
  expect(jobs.length).toBeGreaterThanOrEqual(1);
  const active = jobs.filter(job => !job.signal.aborted); expect(active).toHaveLength(1);
  const releases = jobs.map(() => vi.fn());
  await act(async () => { jobs.forEach((job, i) => job.resolve({ value: job.signal.aborted ? "old" : "current", release: releases[i]! })); });
  expect(dom.querySelector("b")?.textContent).toBe("current");
  for (let i = 0; i < jobs.length; i++) expect(releases[i]).toHaveBeenCalledTimes(jobs[i]!.signal.aborted ? 1 : 0);
  const count = jobs.length;
  content += " grows";
  await act(() => root.render(h(StrictMode, null, h(QuireMarkdown, { content, options, identity: "one" }))));
  expect(jobs).toHaveLength(count);
  await act(() => root.render(h(StrictMode, null, h(QuireMarkdown, { content, options, identity: "two" }))));
  expect(active[0]!.signal.aborted).toBe(true); expect(jobs.length).toBeGreaterThan(count);
  await act(() => root.unmount()); roots.delete(root);
  const lateRelease = vi.fn();
  await act(async () => { jobs.slice(count).forEach(job => job.resolve({ value: "late", release: lateRelease })); });
  expect(lateRelease).toHaveBeenCalledTimes(jobs.length - count);
  for (const release of releases) expect(release).toHaveBeenCalledTimes(1);
});

it("reloads unproven custom inputs on append instead of freezing them", async () => {
  const load = vi.fn(() => ({ value: "ok", release })), release = vi.fn();
  const options = { extensions: [withMarkdownReading(Badge, { load, render: (_context, value) => h("b", null, value) })] };
  const dom = document.createElement("div"), root = createRoot(dom); roots.add(root);
  let content = "[[ok]]\n\n" + "padding\n\n".repeat(30) + "Tail";
  await act(() => root.render(h(QuireMarkdown, { content, options })));
  expect(load).toHaveBeenCalledTimes(1);
  content += " grows"; await act(() => root.render(h(QuireMarkdown, { content, options })));
  expect(load).toHaveBeenCalledTimes(2); expect(release).toHaveBeenCalledTimes(1);
});

it.each(["load", "render", "bounds"])("isolates %s failures to the custom node", async phase => {
  const onError = vi.fn(), definition: MarkdownReadingDefinition = phase === "load"
    ? { load: () => Promise.reject(new Error("load failed")), render: () => "unused" }
    : { render: context => { if (phase === "bounds") return context.renderInline(context.node.from - 1); throw new Error("render failed"); } };
  const options = { extensions: [withMarkdownReading(Badge, definition)] };
  const dom = document.createElement("div"), root = createRoot(dom); roots.add(root);
  const content = "Before\n\n[[ok]]\n\nAfter";
  if (phase !== "load") expect(renderToString(h(QuireMarkdown, { content, options, onError }))).toContain("[[ok]]");
  await act(() => root.render(h(QuireMarkdown, { content, options, onError })));
  expect(dom.textContent).toBe("Before[[ok]]After");
  expect(onError.mock.calls.some(([error]) => error.owner === "badge" && error.phase === (phase === "load" ? "load" : "render"))).toBe(true);
});

it("catches descendant component failures and releases their acquired resource", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const release = vi.fn(), onError = vi.fn();
  /** @returns Never produces content; exercises React's descendant error boundary. */
  function Broken(): never { throw new Error("child failed"); }
  const options = { extensions: [withMarkdownReading(Badge, { load: () => ({ value: 1, release }), render: () => h(Broken) })] };
  const dom = document.createElement("div"), root = createRoot(dom); roots.add(root);
  await act(() => root.render(h(QuireMarkdown, { content: "[[ok]]\n\nStill here", options, onError })));
  expect(dom.textContent).toBe("[[ok]]Still here"); expect(release).toHaveBeenCalledTimes(1);
  expect(onError.mock.calls.some(([error]) => error.phase === "render")).toBe(true);
});

it("reports throwing finalizers as disposal failures while retaining the next document", async () => {
  const onError = vi.fn();
  const options = { extensions: [withMarkdownReading(Badge, {
    load: () => ({ value: "ready", release: () => { throw new Error("release failed"); } }), render: (_context, value) => value,
  })] };
  const dom = document.createElement("div"), root = createRoot(dom); roots.add(root);
  await act(() => root.render(h(QuireMarkdown, { content: "[[ok]]", options, onError })));
  await act(() => root.render(h(QuireMarkdown, { content: "Replacement", options, onError })));
  expect(dom.textContent).toBe("Replacement"); expect(onError.mock.calls[0]?.[0].phase).toBe("dispose");
});
