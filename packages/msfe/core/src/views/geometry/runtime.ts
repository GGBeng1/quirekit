import { ViewPlugin, type EditorView, type ViewUpdate } from "@quirekit/cm-view";
import { applyViewStateUpdate } from "../../editor/view-state";
import { nodeGeometryEffect, nodeGeometryField } from "./field";
import type { ViewRecord } from "../types";
import type { NodeGeometryUpdate, NodeHeight } from "./types";

const owners = new WeakMap<EditorView, GeometryObserver>();

/** Coalesces mounted node resizes and content-width invalidation into bounded native read/write phases. */
export class GeometryObserver {
  private pending = new Map<ViewRecord, HTMLElement>();
  private mounted = new Map<ViewRecord, HTMLElement>();
  private measuring = false;
  private awaitingUpdate = false;
  private frame: number | undefined;
  private disposed = false;
  /** @param view - Sole mounted source and layout owner. */
  constructor(private readonly view: EditorView) { owners.set(view, this); }
  /** @returns Whether newly invalidated or measured dimensions still precede a navigation correction. */
  get pendingUpdate(): boolean { return this.awaitingUpdate || this.pending.size > 0; }
  /** @param record - Still-mounted source binding. @param dom - Wrapper whose size changed. */
  measure(record: ViewRecord, dom: HTMLElement): void {
    if (record.spec.placement !== "replace" || !record.spec.measureHeight) return;
    this.mounted.set(record, dom); this.pending.set(record, dom); this.schedule();
  }
  /** @param record - Retired binding. @param dom - Its exact wrapper; a newer mount is retained. */
  forget(record: ViewRecord, dom: HTMLElement): void {
    if (this.mounted.get(record) === dom) this.mounted.delete(record);
    if (this.pending.get(record) === dom) this.pending.delete(record);
  }
  /** @param update - Actual native geometry updates invalidate dimensions when the content width changes. */
  update(update: ViewUpdate): void {
    if (update.geometryChanged) for (const [record, dom] of this.mounted) this.pending.set(record, dom);
    if (this.pending.size || update.geometryChanged && update.state.field(nodeGeometryField).entries.length
      || update.transactions.some(transaction => transaction.reconfigured)) this.schedule();
  }
  /** Schedules at most one read batch; no source serialization or whole-document DOM query. */
  private schedule(): void {
    if (this.disposed || this.measuring || this.frame !== undefined) return;
    this.measuring = true;
    this.view.requestMeasure({ key: this, read: () => this.read(), write: measured => {
      this.measuring = false;
      if (this.disposed) return;
      // CM may report a new geometry update between this batch's read and write. Preserve that invalidation.
      if (!measured) { if (this.pending.size) this.schedule(); return; }
      const doc = this.view.state.doc;
      this.frame = this.view.dom.ownerDocument.defaultView!.requestAnimationFrame(() => {
        this.frame = undefined;
        if (!this.disposed && this.view.state.doc === doc) applyViewStateUpdate(this.view, { effects: [nodeGeometryEffect.of(measured)], preserveScroll: false });
        this.awaitingUpdate = false;
        if (this.pending.size) this.schedule();
      });
    } });
  }
  /** @returns Only changed dimensions from live wrappers, or width invalidation; stable layout produces no transaction. */
  private read(): NodeGeometryUpdate | undefined {
    if (this.disposed) return undefined;
    const state = this.view.state.field(nodeGeometryField), width = this.view.contentDOM.clientWidth;
    const entries: NodeHeight[] = [];
    // Width/configuration invalidation remeasures only mounted wrappers, including fixed-width content whose own box did not resize.
    for (const [record, dom] of state.width === width ? this.pending : this.mounted) {
      if (!record.alive || !dom.isConnected) continue;
      const box = dom.getBoundingClientRect();
      // Framework portals can be connected before their children commit. An empty mount has no measured size yet.
      if (box.height === 0) continue;
      const height = box.height > this.view.defaultLineHeight ? box.height : 0;
      const alignment = this.view.dom.ownerDocument.defaultView!.getComputedStyle(dom).verticalAlign;
      const previous = state.width === width ? state.entries.find(entry => entry.from === record.from && entry.name === record.name) : undefined;
      if (previous ? Math.abs(previous.height - height) < 0.5 && previous.alignment === alignment && previous.source === record.source : height === 0) continue;
      entries.push({ from: record.from, to: record.to, name: record.name, spec: record.spec, source: record.source, height, alignment });
    }
    this.pending.clear();
    const changed = entries.length > 0 || state.width !== width && state.entries.length > 0;
    this.awaitingUpdate = changed;
    return changed ? { width, entries } : undefined;
  }
  /** Retires stale width/size writes before a replacement document or destroyed view. */
  destroy(): void {
    this.disposed = true; this.awaitingUpdate = false; this.pending.clear(); this.mounted.clear();
    if (this.frame !== undefined) this.view.dom.ownerDocument.defaultView!.cancelAnimationFrame(this.frame);
    if (owners.get(this.view) === this) owners.delete(this.view);
  }
}

/** Direct dimensions plus their mounted measurement lifetime. */
export const nodeViewGeometry = [nodeGeometryField, ViewPlugin.fromClass(GeometryObserver)];
/** @param record - Current source-bound wrapper owner. @param dom - Measured component boundary. Defers reading geometry into CM's coordinated read phase. */
export function measureNodeView(record: ViewRecord, dom: HTMLElement): void { owners.get(record.view)?.measure(record, dom); }
/** @param record - Retired source binding. @param dom - Its renderer wrapper. Releases DOM references while retaining only valid measured source dimensions. */
export function forgetNodeView(record: ViewRecord, dom: HTMLElement): void { owners.get(record.view)?.forget(record, dom); }
/** @param view - Current native owner. @returns Whether invalidated dimensions still need reading or acceptance. */
export function nodeGeometryPending(view: EditorView): boolean { return owners.get(view)?.pendingUpdate ?? false; }
