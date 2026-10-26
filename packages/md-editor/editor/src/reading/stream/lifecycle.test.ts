// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import type { ResourceLease } from "@quirekit/msfe-core";
import MdProse from "../../vue/prose.vue";
import { withMdReading } from "../contributions/extension";
import { Status } from "../contributions/fixtures";
import { MdProseStream } from "./session";
import { mountProse } from "./fixtures";
import { MarkdownRenderer } from "@quirekit/incremark/vue";

describe("text reading lifecycle", () => {
  it("uses the shared default block cache with the product adapter", async () => {
    const spy = vi.spyOn(MarkdownRenderer.prototype, "render");
    const source = "Stable **paragraph**.\n\n".repeat(40) + "Tail";
    const view = mountProse({ content: source }); await nextTick();
    await view.update({ content: source + " grows" });
    expect((spy.mock.contexts.at(-1) as MarkdownRenderer).work.reusedBlocks).toBe(40);
    expect((spy.mock.contexts.at(-1) as MarkdownRenderer).work.projectedNodes).toBeLessThan(5);
    await view.update({ cache: false }); expect((spy.mock.contexts.at(-1) as MarkdownRenderer).work.reusedBlocks).toBe(0);
  });

  it("treats terminal transport states as metadata and recovers after replacement or clearing", async () => {
    const advance = vi.spyOn(MdProseStream.prototype, "advance");
    const view = mountProse({ content: "[x]\n\n[x]: /old", status: "receiving", identity: "one" });
    await vi.waitFor(() => expect(view.root.querySelector('a[href="/old"]')).not.toBeNull());
    advance.mockClear();
    for (const status of ["stopped", "error", "complete", "receiving"] as const) await view.update({ status });
    expect(advance).not.toHaveBeenCalled();
    expect(view.root.querySelectorAll(".cm-editor")).toHaveLength(0);
    await view.update({ content: "[x]", identity: "two" });
    expect(view.root.querySelector("a")).toBeNull(); expect(view.root.textContent).toBe("[x]");
    await view.update({ content: "" }); expect(view.root.textContent).toBe("");
    await view.update({ content: "new **message**" }); expect(view.root.querySelector("strong")?.textContent).toBe("message");
  });

  it("cancels pending parser work on replacement and unmount", async () => {
    vi.useFakeTimers();
    const advance = vi.spyOn(MdProseStream.prototype, "advance").mockReturnValue(false);
    const view = mountProse({ content: "first", identity: "one" }); await nextTick();
    const first = advance.mock.contexts[0];
    expect(vi.getTimerCount()).toBe(1);
    await view.update({ content: "second", identity: "two" });
    const calls = advance.mock.contexts.filter(owner => owner === first).length;
    await vi.advanceTimersByTimeAsync(32);
    expect(advance.mock.contexts.filter(owner => owner === first)).toHaveLength(calls);
    view.dispose(); const count = advance.mock.calls.length;
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(64); expect(advance).toHaveBeenCalledTimes(count);
  });

  it("retains exact source after a configuration error and accepts a repaired configuration", async () => {
    const content = "# source <script>bad()</script>", duplicate = { id: "duplicate" };
    const view = mountProse({ content, options: { extensions: [duplicate, duplicate] } }); await nextTick();
    expect(view.root.textContent).toBe(content); expect(view.root.querySelector("script")).toBeNull();
    expect(view.errors).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ owner: "md-prose", phase: "parse" }));
    await view.update({ options: {} }); expect(view.root.querySelector("h1")?.textContent).toContain("source");
    expect(view.unhandled).not.toHaveBeenCalled();
  });

  it("aborts old message reading resources even when new content is identical", async () => {
    const jobs: { signal: AbortSignal; resolve: (lease: ResourceLease<string>) => void }[] = [];
    const feature = withMdReading(Status, {
      load: (_context, signal) => new Promise<ResourceLease<string>>(resolve => jobs.push({ signal, resolve })),
      render: (_context, resource) => h("b", resource),
    });
    const view = mountProse({ content: "[[todo]]", identity: "one", options: { extensions: [feature] } });
    await vi.waitFor(() => expect(jobs).toHaveLength(1));
    await view.update({ identity: "two" }); await vi.waitFor(() => expect(jobs).toHaveLength(2));
    expect(jobs[0]!.signal.aborted).toBe(true);
    const stale = vi.fn(), active = vi.fn();
    jobs[0]!.resolve({ value: "stale", release: stale }); jobs[1]!.resolve({ value: "current", release: active });
    await vi.waitFor(() => expect(view.root.textContent).toBe("current"));
    expect(stale).toHaveBeenCalledTimes(1);
    view.dispose(); expect(active).toHaveBeenCalledTimes(1); expect(jobs[1]!.signal.aborted).toBe(true);
  });

  it("hydrates the same escaped SSR source before starting client parsing", async () => {
    const content = "## hydrated\n\n<script>bad()</script>";
    const render = () => h(MdProse, { content });
    const html = await renderToString(createSSRApp({ render }));
    expect(html).toContain("&lt;script&gt;bad()&lt;/script&gt;"); expect(html).not.toContain("<h2");
    const root = document.createElement("div"); root.innerHTML = html; document.body.append(root);
    const warn = vi.spyOn(console, "warn"), error = vi.spyOn(console, "error");
    const app = createSSRApp({ render });
    try {
      app.mount(root); await nextTick();
      expect(root.querySelector("h2")?.textContent).toBe("hydrated");
      expect(root.querySelector("script")).toBeNull(); expect(warn).not.toHaveBeenCalled(); expect(error).not.toHaveBeenCalled();
    } finally { app.unmount(); root.remove(); }
  });
});
