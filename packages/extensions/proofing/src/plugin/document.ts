import type { DecorationSet, Transaction } from "@quirekit/pm";
import type { ProofingRange } from "../types";
import { addProofingRange, mapProofingRanges, touchesProofingRange } from "./ranges";
import type { ProofingInflightBlock, ProofingPluginState } from "./types";

/**
 * Finds the single interval of the new document that differs from the old one.
 *
 * Structural sharing keeps this proportional to the changed path, not the
 * document size or the step count.
 *
 * @param tr - Document-changing transaction.
 * @returns Changed interval in the new document, or null when only document attributes changed.
 */
function diffNewDocument(tr: Transaction): ProofingRange | null {
  const before = tr.before.content;
  const after = tr.doc.content;
  const start = before.findDiffStart(after);
  if (start === null) return null;
  let { a, b } = before.findDiffEnd(after) ?? { a: before.size, b: after.size };
  // Repeated content around an edit lets the backward scan pass the start; shift both ends together.
  const overlap = start - Math.min(a, b);
  if (overlap > 0) b += overlap;
  return { from: start, to: b };
}

/**
 * Maps proofing state through a document change.
 *
 * Every finding is mapped, not only those near the edit, so underlines after
 * the change keep their place. Findings and one-off ignores the edit touched
 * are dropped; the touched textblocks become dirty, and answers still pending
 * for them become stale.
 *
 * @param value - State in the old document.
 * @param tr - Document-changing transaction.
 * @returns State in the new document.
 */
export function mapProofingDocument(value: ProofingPluginState, tr: Transaction): ProofingPluginState {
  const size = tr.doc.content.size;
  const changed = diffNewDocument(tr);
  // Attribute-only changes, such as a style registry update, can change every block's language.
  const touched = changed === null
    ? { from: 0, to: size }
    : { from: Math.max(0, changed.from - 1), to: Math.min(size, changed.to + 1) };
  let removedByMapping = 0;
  const mappedIssues = value.issues.map(tr.mapping, tr.doc, { onRemove: () => { removedByMapping += 1; } });
  const edited = changed === null ? [] : findEdited(mappedIssues, changed);
  const issues = mappedIssues.remove(edited);
  const mappedIgnored = value.ignored.map(tr.mapping, tr.doc);
  const ignored = changed === null ? mappedIgnored : mappedIgnored.remove(findEdited(mappedIgnored, changed));
  return {
    ...value,
    issues,
    ignored,
    issueCount: value.issueCount - removedByMapping - edited.length,
    dirty: value.enabled ? addProofingRange(mapProofingRanges(value.dirty, tr.mapping), touched) : [],
    inflight: value.inflight.map((block) => mapInflight(block, tr, touched))
  };
}

/**
 * Finds decorations an edit overlapped; touching ends are kept so typing after a word maps it.
 *
 * @param decorations - Decorations in the new document.
 * @param changed - Changed interval in the new document.
 * @returns Overlapped decorations.
 */
function findEdited(decorations: DecorationSet, changed: ProofingRange) {
  return decorations.find(changed.from, changed.to).filter((decoration) => changed.from === changed.to
    ? decoration.from < changed.from && decoration.to > changed.from
    : decoration.from < changed.to && decoration.to > changed.from);
}

/**
 * Maps one pending block, marking it stale when the edit reached it.
 *
 * @param block - Pending block in the old document.
 * @param tr - Document-changing transaction.
 * @param touched - Dirtied interval in the new document.
 * @returns Pending block in the new document.
 */
function mapInflight(block: ProofingInflightBlock, tr: Transaction, touched: ProofingRange): ProofingInflightBlock {
  const from = tr.mapping.map(block.from, 1);
  const to = tr.mapping.map(block.to, -1);
  const stale = block.stale || to <= from || touchesProofingRange({ from, to }, touched);
  return { ...block, from, to, stale };
}
