import type { QuireEditorTransactionEvent } from "@quirekit/core";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { ClassicEditorRenderContext } from "@classic/types";
import { createClassicEditorOutlineTree } from "./model";
import { createClassicEditorOutlineHeadingCollector } from "./summary";
import type { ClassicEditorOutlineOccurrence, ClassicEditorOutlineTree } from "./types";

let nextRegistryId = 0;

/**
 * Retains document occurrences without assigning identity to shared PM Node objects.
 * @param initialDocument - Canonical snapshot when this editor subscription starts.
 * @returns Batch mapping and current presentation projection for one mounted editor.
 */
export function createClassicEditorOutlineOccurrences(initialDocument: ProseMirrorNode) {
  const registryId = ++nextRegistryId;
  let nextId = 0;
  let document = initialDocument;
  let occurrences: ClassicEditorOutlineOccurrence[] = [];
  let previous: ClassicEditorOutlineTree | undefined;
  const headings = createClassicEditorOutlineHeadingCollector();

  /**
   * Maps every accepted transaction, including plugin-appended structural changes.
   * @param event - Applied root transaction and its ordered appended transactions.
   */
  function applyBatch(event: Pick<QuireEditorTransactionEvent, "transaction" | "appendedTransactions">): void {
    for (const transaction of [event.transaction, ...event.appendedTransactions]) {
      // A missing batch cannot establish identity even if positions happen to match.
      if (transaction.before !== document) occurrences = [];
      occurrences = occurrences.flatMap(occurrence => {
        const from = transaction.mapping.mapResult(occurrence.from, 1);
        const to = transaction.mapping.mapResult(occurrence.to, -1);
        if (from.deleted || to.deleted || from.pos >= to.pos) return [];
        const node = transaction.doc.nodeAt(from.pos);
        if (node === null || node.nodeSize !== to.pos - from.pos) return [];
        return [{ id: occurrence.id, from: from.pos, to: to.pos }];
      });
      document = transaction.doc;
    }
  }

  /**
   * Reclassifies current extension semantics while sharing unchanged presentation.
   * @param context - Current canonical editor and potentially mutable style providers.
   * @param untitledLabel - Localized fallback for empty headings.
   * @returns Stable visual nodes and current navigation positions.
   */
  function project(context: ClassicEditorRenderContext, untitledLabel: string): ClassicEditorOutlineTree {
    if (document !== context.editor.state.doc) {
      document = context.editor.state.doc;
      occurrences = [];
    }
    const candidates = new Map(occurrences.map(occurrence => [occurrence.from, occurrence]));
    const current: ClassicEditorOutlineOccurrence[] = [];
    /** @param node - Classified current node. @param position - Its unique occurrence position. @returns Existing proven identity or a fresh id. */
    function identify(node: ProseMirrorNode, position: number): string {
      const candidate = candidates.get(position);
      const id = candidate?.to === position + node.nodeSize ? candidate.id : `outline-${registryId}-${++nextId}`;
      current.push({ id, from: position, to: position + node.nodeSize });
      return id;
    }
    const entries = headings.collect(context, untitledLabel, identify);
    occurrences = current;
    previous = createClassicEditorOutlineTree(entries, previous);
    return previous;
  }
  return { applyBatch, project, readSummarizedNodes: headings.readSummarizedNodes };
}
