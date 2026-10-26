// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { createApp, createSSRApp, h, nextTick, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";
import { Node, defineSource, type ResourceLease } from "@quirekit/msfe-core";
import type { MarkdownConfig } from "@quirekit/lezer-markdown";
import { MarkdownStream, type MarkdownOptions } from "../index";
import { QuireMarkdown, withMarkdownReading } from "./index";

const cleanups: (() => void)[] = [];
afterEach(() => { cleanups.splice(0).forEach(dispose => dispose()); vi.restoreAllMocks(); vi.useRealTimers(); });

const syntax: MarkdownConfig = { defineNodes: ["Badge"], parseInline: [{ name: "Badge",
  /** @param cx - Canonical inline parser. @param next - Current character. @param pos - UTF-16 start. @returns Consumed end or rejection. */
  parse(cx, next, pos) {
    const match = next === 64 ? /^@\{([a-z]+)\}/u.exec(cx.slice(pos, cx.end)) : null;
    return match ? cx.addElement(cx.elt("Badge", pos, pos + match[0].length)) : -1;
  },
}] };
const Badge = Node.create({ name: "badge",
  addAttributes: () => ({ value: { validate: value => value === "ok" } }),
  addSource: () => defineSource<{ value: string }>({ nodes: ["Badge"],
    read: (document, node) => ({ value: document.slice(node.from + 2, node.to - 1) }), patch: () => null }),
});

it("combines native Lezer syntax with validated custom nodes at every stream boundary", async () => {
  const options: MarkdownOptions = { preset: false, syntax: [syntax], extensions: [withMarkdownReading(Badge, {
    render: ({ attrs }) => h("b", { "data-badge": "" }, String(attrs.value)),
  })] };
  const content = shallowRef(""), root = document.createElement("div");
  const app = createApp({ render: () => h(QuireMarkdown, { content: content.value, options }) });
  cleanups.push(() => app.unmount()); app.mount(root);
  for (const character of "@{ok} @{bad} `@{ok}`") {
    content.value += character; await nextTick();
    // An unmatched backtick is ordinary Markdown text; only its closing delimiter
    // reclassifies the second valid token as inert code.
    const count = !content.value.startsWith("@{ok}") ? 0 : content.value.endsWith("`@{ok}") ? 2 : 1;
    expect(root.querySelectorAll("[data-badge]")).toHaveLength(count);
  }
  expect(root.textContent).toBe("ok @{bad} @{ok}");
  content.value = "@{bad}"; await nextTick(); expect(root.textContent).toBe("@{bad}");
  content.value = "@{ok}"; await nextTick(); expect(root.textContent).toBe("ok");
});

it("starts resources only on the client and releases old identities and late results", async () => {
  const jobs: { signal: AbortSignal; resolve: (lease: ResourceLease<string>) => void }[] = [];
  const options: MarkdownOptions = { syntax: [syntax], extensions: [withMarkdownReading(Badge, {
    load: (_context, signal) => new Promise<ResourceLease<string>>(resolve => jobs.push({ signal, resolve })),
    render: (_context, resource) => h("b", resource),
  })] };
  const identity = shallowRef("one");
  const render = () => h(QuireMarkdown, { content: "@{ok}", identity: identity.value, options });
  const html = await renderToString(createSSRApp({ render })); expect(jobs).toHaveLength(0);
  const root = document.createElement("div"); root.innerHTML = html;
  const app = createSSRApp({ render }); app.mount(root); cleanups.push(() => app.unmount());
  await vi.waitFor(() => expect(jobs).toHaveLength(1));
  identity.value = "two"; await nextTick(); await vi.waitFor(() => expect(jobs).toHaveLength(2));
  expect(jobs[0]!.signal.aborted).toBe(true);
  const oldRelease = vi.fn(), newRelease = vi.fn();
  jobs[0]!.resolve({ value: "old", release: oldRelease }); jobs[1]!.resolve({ value: "current", release: newRelease });
  await vi.waitFor(() => expect(root.textContent).toBe("current")); expect(oldRelease).toHaveBeenCalledTimes(1);
  cleanups.pop()!(); expect(jobs[1]!.signal.aborted).toBe(true); expect(newRelease).toHaveBeenCalledTimes(1);
});

it("cancels scheduled parser continuations on replacement and unmount", async () => {
  vi.useFakeTimers();
  const advance = vi.spyOn(MarkdownStream.prototype, "advance").mockReturnValue(false);
  const content = shallowRef("first"), root = document.createElement("div");
  const app = createApp({ render: () => h(QuireMarkdown, { content: content.value, ssr: "source" }) });
  app.mount(root); cleanups.push(() => app.unmount()); await nextTick();
  const old = advance.mock.contexts[0]; content.value = "second"; await nextTick();
  const count = advance.mock.contexts.filter(value => value === old).length;
  await vi.advanceTimersByTimeAsync(48);
  expect(advance.mock.contexts.filter(value => value === old)).toHaveLength(count);
  cleanups.pop()!(); expect(vi.getTimerCount()).toBe(0);
});
