// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, inject, nextTick, shallowRef } from "vue";
import type { EditorState } from "@quirekit/cm-state";
import type { ResourceLease } from "@quirekit/msfe-core";
import MdProse from "../../vue/prose.vue";
import { withMdReading } from "./extension";
import { Status, readingState } from "./fixtures";

const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); });

/** @param initial - Captured canonical snapshot. @returns A real mounted Vue consumer and its public snapshot input. */
function mount(initial: EditorState) {
  const state = shallowRef(initial), errors = vi.fn(), unhandled = vi.fn();
  const root = document.createElement("div"); document.body.append(root);
  const app = createApp({ render: () => h(MdProse, { state: state.value, onError: errors }) });
  app.provide("reading-provider", "host-context"); app.config.errorHandler = unhandled;
  let active = true;
  /** Idempotently releases the consumer and all reading resources. */
  function dispose(): void { if (active) { active = false; app.unmount(); root.remove(); } }
  cleanups.push(dispose); app.mount(root);
  return { state, root, errors, unhandled, dispose };
}

describe("reading resource generations", () => {
  it("cancels replacement requests, releases late leases and preserves the current snapshot", async () => {
    const pending: { signal: AbortSignal; resolve: (lease: ResourceLease<string>) => void }[] = [];
    const feature = withMdReading(Status, {
      load: (_context, signal) => new Promise<ResourceLease<string>>(resolve => pending.push({ signal, resolve })),
      render: ({ attrs }, resource) => h("b", `${attrs.value}:${resource}`),
    });
    const consumer = mount(readingState(feature));
    await vi.waitFor(() => expect(pending).toHaveLength(1));
    expect(consumer.root.textContent).toContain("[[todo]]");
    consumer.state.value = consumer.state.value.update({ changes: { from: 9, to: 13, insert: "done" } }).state;
    await vi.waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[0]!.signal.aborted).toBe(true);
    const staleRelease = vi.fn(), currentRelease = vi.fn();
    pending[1]!.resolve({ value: "current", release: currentRelease });
    await vi.waitFor(() => expect(consumer.root.textContent).toContain("done:current"));
    pending[0]!.resolve({ value: "obsolete", release: staleRelease });
    await vi.waitFor(() => expect(staleRelease).toHaveBeenCalledTimes(1));
    expect(consumer.root.textContent).not.toContain("obsolete");
    consumer.dispose(); consumer.dispose();
    expect(pending[1]!.signal.aborted).toBe(true); expect(currentRelease).toHaveBeenCalledTimes(1);
    expect(consumer.errors).not.toHaveBeenCalled();
  });

  it("releases a result arriving after unmount even if the provider ignores cancellation", async () => {
    let complete!: (lease: ResourceLease<string>) => void;
    const load = vi.fn(() => new Promise<ResourceLease<string>>(resolve => { complete = resolve; }));
    const consumer = mount(readingState(withMdReading(Status, { load, render: () => "ready" })));
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    consumer.dispose(); const release = vi.fn(); complete({ value: "late", release });
    await vi.waitFor(() => expect(release).toHaveBeenCalledTimes(1));
    expect(consumer.errors).not.toHaveBeenCalled();
  });

  it("does zero decoding/loading work for pure selections but refreshes a replaced document", async () => {
    const original = Status.resolve(() => { throw Error("no editor"); });
    const read = vi.fn(original.source!.codec.read), load = vi.fn(() => ({ value: "resource" }));
    const descriptor = { ...original, source: { ...original.source!, codec: { ...original.source!.codec, read } } };
    const feature = withMdReading(descriptor, { load, render: ({ attrs }) => h("b", String(attrs.value)) });
    const consumer = mount(readingState(feature));
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    const reads = read.mock.calls.length;
    for (const anchor of [2, 3, 4]) { consumer.state.value = consumer.state.value.update({ selection: { anchor } }).state; await nextTick(); }
    expect(read).toHaveBeenCalledTimes(reads); expect(load).toHaveBeenCalledTimes(1);
    consumer.state.value = readingState(feature, "new [[done]] document");
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(consumer.root.textContent).toContain("done");
  });

  it("isolates loader errors and recovers on a new source snapshot", async () => {
    const failure = new Error("provider-failed"), load = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue({ value: "recovered" });
    const consumer = mount(readingState(withMdReading(Status, { load, render: (_context, resource) => h("b", String(resource)) })));
    await vi.waitFor(() => expect(consumer.errors).toHaveBeenCalledTimes(1));
    expect(consumer.root.textContent).toBe("before [[todo]] after");
    expect(consumer.errors).toHaveBeenCalledWith(expect.objectContaining({ phase: "load", cause: failure, from: 7, to: 15 }));
    consumer.state.value = consumer.state.value.update({ changes: { from: 9, to: 13, insert: "done" } }).state;
    await vi.waitFor(() => expect(consumer.root.textContent).toContain("recovered"));
    expect(consumer.unhandled).not.toHaveBeenCalled();
  });

  it("inherits host providers and contains descendant component failures", async () => {
    const Child = defineComponent({ setup() { const value = inject("reading-provider"); return () => h("i", String(value)); } });
    const working = mount(readingState(withMdReading(Status, { render: () => h(Child) })));
    expect(working.root.textContent).toBe("before host-context after");
    const failure = new Error("child-failed"), Broken = defineComponent({ setup() { throw failure; } });
    const broken = mount(readingState(withMdReading(Status, { render: () => h(Broken) })));
    await nextTick();
    expect(broken.root.textContent).toBe("before [[todo]] after");
    expect(broken.errors).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ phase: "render", cause: failure }));
    expect(broken.unhandled).not.toHaveBeenCalled();
  });

  it("reports disposal failures against the old range without poisoning its replacement", async () => {
    const failure = new Error("release-failed");
    const feature = withMdReading(Status, {
      load: ({ attrs }) => ({ value: attrs.value, release: () => { if (attrs.value === "todo") throw failure; } }),
      render: (_context, resource) => h("b", String(resource)),
    });
    const consumer = mount(readingState(feature));
    await vi.waitFor(() => expect(consumer.root.textContent).toBe("before todo after"));
    consumer.state.value = readingState(feature, "[[done]]");
    await vi.waitFor(() => expect(consumer.root.textContent).toBe("done"));
    expect(consumer.errors).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ phase: "dispose", from: 7, to: 15, cause: failure }));
    expect(consumer.unhandled).not.toHaveBeenCalled();
  });
});
