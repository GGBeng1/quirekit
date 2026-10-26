import { EditorSelection, type Transaction } from "@quirekit/cm-state";
import type { MsfeEditor } from "../editor/types";
import type { MsfeSourceRange } from "../views/types";
import { mapSourceRange } from "./set";
import { createSourceIdentity } from "../identity/uuid";
import type { AnchorContent, RangePolicy, SourceAnchor, SourceRange } from "./types";

/** Explicit short-lived UI intents. Work is bounded by captured, unreleased anchors. */
export class SourceAnchors {
  private readonly anchors = new Map<string, SourceRange<AnchorContent>>();
  /** @param editor - Canonical editor resolved lazily. */
  constructor(private readonly editor: () => MsfeEditor) {}
  /** @param interval - Current source coordinates. @param policy - Insertion/deletion choices.
   * @returns Intent whose writes require both current generation and unchanged captured text. */
  capture(interval: MsfeSourceRange, policy: RangePolicy = {}): SourceAnchor {
    const { from, to } = interval, editor = this.editor();
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < from || to > editor.state.doc.length) throw new RangeError("invalid-source-range");
    const id = createSourceIdentity();
    this.anchors.set(id, { id, from, to, value: { text: editor.state.sliceDoc(from, to), document: editor.state.doc }, ...policy });
    return {
      getRange: () => { const range = this.anchors.get(id); return range ? { from: range.from, to: range.to } : null; },
      target: () => {
        const range = this.anchors.get(id);
        if (!range || editor.state.sliceDoc(range.from, range.to) !== range.value.text) return null;
        return { ...editor.captureTarget(), selection: EditorSelection.single(range.from, range.to) };
      },
      release: () => { this.anchors.delete(id); },
    };
  }
  /** @param transactions - Already accepted transactions, in order. */
  map(transactions: readonly Transaction[]): void {
    for (const transaction of transactions) if (transaction.docChanged) for (const [id, range] of this.anchors) {
      // New widgets may have captured final-state coordinates during CM's update phase.
      // Map only the old source version, preserving each intent's coordinate authority.
      if (range.value.document !== transaction.startState.doc) continue;
      const mapped = mapSourceRange(range, transaction.changes);
      if (mapped) this.anchors.set(id, { ...mapped, value: { text: mapped.value.text, document: transaction.state.doc } });
      else this.anchors.delete(id);
    }
  }
  /** Ends all captured intents, including when a replacement reuses the document id. */
  clear(): void { this.anchors.clear(); }
}
