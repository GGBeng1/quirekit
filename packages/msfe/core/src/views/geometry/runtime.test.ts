import { describe, expect, it } from "vitest";
import type { Transaction } from "@quirekit/cm-state";
import type { EditorView, ViewUpdate } from "@quirekit/cm-view";
import { createDocumentState } from "../../mount/state";
import { modeFacet } from "../../state/fields";
import { nodeGeometryField } from "./field";
import { GeometryObserver, nodeGeometryPending } from "./runtime";
import type { NodeGeometryUpdate } from "./types";
import type { ViewRecord } from "../types";

/** @returns Native measurement phases controlled independently of framework and browser callback timing. */
function harness() {
  const source = "![alt](/image)", reads: NonNullable<Parameters<EditorView["requestMeasure"]>[0]>[] = [], frames: FrameRequestCallback[] = [];
  let height = 20;
  const owner = {
    state: createDocumentState(source, [nodeGeometryField, modeFacet.of("locked")]),
    contentDOM: { clientWidth: 800 }, defaultLineHeight: 20,
    dom: { ownerDocument: { defaultView: {
      getComputedStyle: () => ({ verticalAlign: "middle" }),
      requestAnimationFrame: (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; },
      cancelAnimationFrame: () => {},
    } } },
    /** @param request - A native read/write batch, run separately to reproduce intervening layout updates. */
    requestMeasure(request: (typeof reads)[number]) { reads.push(request); },
    /** @param transaction - Source-neutral accepted geometry. */
    dispatch(transaction: Transaction) { owner.state = transaction.state; },
  };
  const view = owner as unknown as EditorView;
  const dom = { isConnected: true, getBoundingClientRect: () => ({ height }) } as HTMLElement;
  const record: ViewRecord = { id: "image", from: 0, to: source.length, name: "Image", source, attrs: {},
    spec: { nodes: ["Image"], placement: "replace", measureHeight: true, read: () => ({}), patch: () => null,
      renderer: () => ({ update() {}, destroy() {} }) },
    version: 0, readOnly: true, alive: true, view };
  const observer = new GeometryObserver(view);
  /** @returns One completed native read/write batch, before its deferred state acceptance. */
  function measure(): NodeGeometryUpdate | undefined {
    const request = reads.shift()!, value = request.read(view) as NodeGeometryUpdate | undefined; request.write?.(value, view); return value;
  }
  return { view, dom, record, observer, reads, frames, measure,
    resize: (value: number) => { height = value; },
    geometry: () => observer.update({ geometryChanged: true, state: view.state, transactions: [] } as unknown as ViewUpdate),
  };
}

describe("node geometry measurement phases", () => {
  it("retains geometry invalidated between a no-op read and its write, then becomes idle", () => {
    const current = harness(), { observer, view, record, dom, reads, frames } = current;
    observer.measure(record, dom);
    const first = reads.shift()!, unchanged = first.read(view);
    expect(unchanged).toBeUndefined();
    // CM reports this actual geometry change after request reads but before their writes.
    current.resize(160); current.geometry();
    expect(nodeGeometryPending(view)).toBe(true);
    first.write?.(unchanged, view);
    expect(reads).toHaveLength(1);
    expect(current.measure()?.entries[0]?.height).toBe(160);
    expect(nodeGeometryPending(view)).toBe(true);
    frames.shift()!(0);
    expect(view.state.field(nodeGeometryField).entries[0]?.height).toBe(160);
    expect(nodeGeometryPending(view)).toBe(false);
    current.geometry(); expect(current.measure()).toBeUndefined();
    expect(reads).toHaveLength(0); expect(frames).toHaveLength(0);
    observer.destroy();
  });

  it("ignores uncommitted empty framework mounts and excludes ordinary controls", () => {
    const current = harness(), { observer, view, record, dom, reads, frames } = current;
    observer.measure({ ...record, spec: { ...record.spec, measureHeight: false } }, dom);
    expect(reads).toHaveLength(0);
    current.resize(140); observer.measure(record, dom); current.measure(); frames.shift()!(0);
    current.resize(0); observer.measure(record, dom); expect(current.measure()).toBeUndefined();
    expect(view.state.field(nodeGeometryField).entries[0]?.height).toBe(140);
    current.resize(80); observer.measure(record, dom); current.measure(); frames.shift()!(0);
    expect(view.state.field(nodeGeometryField).entries[0]?.height).toBe(80);
    observer.destroy(); expect(nodeGeometryPending(view)).toBe(false);
  });
});
