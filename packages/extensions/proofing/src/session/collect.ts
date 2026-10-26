import type { QuireEditor } from "@quirekit/core";
import type { EditorState } from "@quirekit/pm";
import { extractProofingBlock } from "../extract/block";
import type { ExtractedProofingBlock } from "../extract/types";
import type { ProofingPluginState } from "../plugin/types";
import type { ProofingDocumentPolicy, ProofingRange } from "../types";
import { orderProofingVisit } from "./order";

/** Limits of one collection pass. */
export interface ProofingCollectBudget {
  /** Blocks needing a provider request before the pass stops. */
  readonly maxPending: number;
  /** Characters of those blocks before the pass stops. */
  readonly maxCharacters: number;
  /** Blocks extracted in total, bounding main-thread time per pass. */
  readonly maxScanned: number;
}

/** Outcome of one collection pass. */
export interface ProofingCollection {
  /** Extracted blocks in visit order. */
  readonly blocks: readonly ExtractedProofingBlock[];
  /** Dirty intervals fully visited, including gaps between textblocks. */
  readonly cleared: readonly ProofingRange[];
}

/**
 * Extracts dirty textblocks: the caret's block first, then visible ones, then the rest from the caret on.
 *
 * Blocks with a pending request are skipped; the plugin re-marks them dirty if
 * an edit made that request stale.
 *
 * @param state - Current editor state.
 * @param value - Proofing plugin state.
 * @param policy - Host document policy.
 * @param budget - Pass limits.
 * @param needsRequest - Decides whether an extracted block must go to the provider.
 * @param visible - Visible document interval, or null when unknown.
 * @returns Extracted blocks and fully visited intervals.
 */
export function collectDirtyBlocks(
  state: EditorState,
  value: ProofingPluginState,
  policy: ProofingDocumentPolicy | null,
  budget: ProofingCollectBudget,
  needsRequest: (block: ExtractedProofingBlock) => boolean,
  visible: ProofingRange | null = null
): ProofingCollection {
  const excluded = policy?.excludedRanges?.(state) ?? [];
  const blocks: ExtractedProofingBlock[] = [];
  const cleared: ProofingRange[] = [];
  // Priority pieces overlap the full visit order, so a block can be reached more than once.
  const visited = new Set<number>();
  let pending = 0;
  let characters = 0;
  const full = () => pending >= budget.maxPending || characters >= budget.maxCharacters || blocks.length >= budget.maxScanned;
  for (const range of orderProofingVisit(value.dirty, state.selection.head, visible)) {
    let reached = range.from;
    state.doc.nodesBetween(range.from, range.to, (node, pos) => {
      if (full()) return false;
      if (!node.isTextblock) return true;
      reached = Math.min(range.to, pos + node.nodeSize);
      if (visited.has(pos)) return false;
      visited.add(pos);
      if (value.inflight.some((entry) => entry.from < pos + node.nodeSize && entry.to > pos)) return false;
      const block = extractProofingBlock({ doc: state.doc, node, pos }, policy, excluded);
      blocks.push(block);
      if (needsRequest(block)) {
        pending += 1;
        characters += block.segments.reduce((sum, segment) => sum + segment.text.length, 0);
      }
      return false;
    });
    if (!full()) reached = range.to;
    if (reached > range.from) cleared.push({ from: range.from, to: reached });
    if (full()) break;
  }
  return { blocks, cleared };
}

/**
 * Reports whether the mounted view is in an input method composition, during which checking waits.
 *
 * @param editor - Editor owning the view.
 * @returns Whether a composition is active.
 */
export function isProofingViewComposing(editor: QuireEditor): boolean {
  try {
    return (editor.view as { readonly composing?: boolean }).composing === true;
  } catch {
    return false;
  }
}
