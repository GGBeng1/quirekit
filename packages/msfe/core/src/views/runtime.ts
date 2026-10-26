import { Decoration, type EditorView, type ViewUpdate } from "@quirekit/cm-view";
import type { Range } from "@quirekit/cm-state";
import type { ProjectionContext } from "../extensions/types";
import type { MsfeEditor } from "../editor/types";
import { sourceFingerprint } from "./binding";
import { createSourceIdentity } from "../identity/uuid";
import { SourceViewWidget } from "./widget";
import type { MsfeComponentHost, MsfeNodeViewSpec, ViewRecord } from "./types";

/** Tracks only projected syntax identities; no full-document component index. */
export class NodeViewRuntime {
  private records = new Map<string, ViewRecord>();
  private readonly seen = new Set<string>();
  /** @param editor - Mounted API resolved lazily. @param host - Framework store. @param report - Error sink. */
  constructor(private readonly editor: () => MsfeEditor, private readonly host: MsfeComponentHost | undefined,
    private readonly report: (error: unknown) => void) {}

  /** @param update - Accepted source mapping before visible projection. */
  map(update: ViewUpdate): void {
    if (!update.docChanged) return;
    for (const transaction of update.transactions) {
      if (!transaction.docChanged) continue;
      for (const record of this.records.values()) {
        transaction.changes.iterChangedRanges((from, to) => {
          // Whole-node replacement is a new identity even if the replacement has identical text.
          if (from <= record.from && to >= record.to && to > from) record.alive = false;
        });
        record.from = transaction.changes.mapPos(record.from, 1);
        record.to = transaction.changes.mapPos(record.to, -1);
      }
    }
  }
  /** Begins one visible projection pass. */
  begin(): void { this.seen.clear(); }
  /** Releases semantic identities no longer represented by the visible projection. */
  end(): void {
    for (const [id, record] of this.records) if (!this.seen.has(id)) { record.alive = false; this.records.delete(id); }
  }
  /** @param view - Input owner. @param spec - Feature codec. @param context - Visible syntax. @returns Inline decoration or source fallback. */
  decorate(view: EditorView, spec: MsfeNodeViewSpec, context: ProjectionContext): Range<Decoration>[] {
    const { node, state, active } = context;
    if ((active && !spec.showWhenActive) || node.from < context.from || node.from > context.to) return [];
    if (spec.placement === "replace" && state.doc.lineAt(node.from).number !== state.doc.lineAt(node.to).number) return [];
    const attrs = spec.read(state, node);
    if (!attrs) return [];
    const source = sourceFingerprint(spec, state, node);
    let record = [...this.records.values()].find(item => item.alive && item.name === node.name && item.from === node.from && item.to === node.to);
    if (!record) {
      record = { id: createSourceIdentity(), from: node.from, to: node.to, name: node.name,
        spec, source, attrs: Object.freeze(attrs), readOnly: state.readOnly, version: 0, alive: true, view };
      this.records.set(record.id, record);
    } else if (record.source !== source || record.readOnly !== state.readOnly) {
      if (record.source !== source) record.attrs = Object.freeze(attrs);
      record.source = source; record.readOnly = state.readOnly; record.version++;
    }
    if (this.seen.has(record.id)) return [];
    this.seen.add(record.id);
    const widget = new SourceViewWidget(record, this.editor, this.host, this.report);
    return [spec.placement === "replace" ? Decoration.replace({ widget }).range(node.from, node.to)
      : Decoration.widget({ widget, side: -1 }).range(node.from)];
  }
  /** Invalidates every old callback before document replacement or destruction. */
  reset(): void { for (const record of this.records.values()) record.alive = false; this.records.clear(); }
}
