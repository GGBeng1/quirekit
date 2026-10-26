import { intersectQuireDocumentRanges } from "@quirekit/renderer";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type {
  QuireTableCellFragment,
  QuireTableHitTarget
} from "../../../table";
import {
  clipQuireRectToSourceFlowClip,
  intersectQuireSourceFlowClips,
  type QuireSourceFlowClip
} from "../source-flow";
import { summarizeQuireTableCellSourceFlowSlice } from "../table/cell-content";
import { createQuireSplitTablePartId } from "../table/part-ids";
import type { QuirePageBodyProjection } from "../types";
import { resolveQuireProjectionOccurrence } from "../occurrence";

/** Source-flow fallback inherited from a projected body cell. */
interface QuireTableHitTargetSourceFlowFallback {
  /** Semantic cell id represented by the projected cell fragment. */
  readonly semanticCellId: QuireTableHitTarget["semanticCellId"];
  /** Explicit origin cell id represented by the projected cell fragment. */
  readonly originExplicitCellId: QuireTableHitTarget["originExplicitCellId"];
  /** Explicit source cell ids owned by the projected cell fragment. */
  readonly explicitCellIds: QuireTableHitTarget["explicitCellIds"];
  /** Table-relative ProseMirror position of the origin explicit cell. */
  readonly originCellPos: QuireTableHitTarget["originCellPos"];
  /** Document range represented by the projected cell fragment. */
  readonly range: QuireDocumentRange;
  /** Source-flow vertical band represented by the projected cell fragment. */
  readonly flowClip: QuireSourceFlowClip;
}

/** Options for projecting normal table body hit targets into one page. */
export interface QuireTableBodyHitTargetsPageProjectionOptions {
  /** Source table body hit targets in infinite-flow coordinates. */
  readonly hitTargets: readonly QuireTableHitTarget[];
  /** Page-owned body cells already projected into source-flow page space. */
  readonly cells: readonly QuireTableCellFragment[];
  /** Page document range represented by the page fragment. */
  readonly pageRange: QuireDocumentRange;
  /** Source-flow band accepted by the page body. */
  readonly flowClip: QuireSourceFlowClip;
  /** Page-body projection used to suffix split ids. */
  readonly projection: QuirePageBodyProjection;
}

/**
 * Projects normal table body hit targets into one page band.
 *
 * @param options - Source hit targets, projected cells, page range, source-flow clip, and projection.
 * @returns Page-owned table body hit targets.
 */
export function projectQuireTableBodyHitTargetsToPage(
  options: QuireTableBodyHitTargetsPageProjectionOptions
): readonly QuireTableHitTarget[] {
  const cellBySemanticId = new Map(
    options.cells.map((cell) => [cell.semanticCellId, cell] as const)
  );

  return options.hitTargets.flatMap((target) => {
    const fallbackCell = cellBySemanticId.get(target.semanticCellId);
    const fallback = fallbackCell === undefined
      ? undefined
      : createQuireTableHitTargetSourceFlowFallback(fallbackCell);

    return fallback === undefined
      ? []
      : projectQuireTableHitTarget(
          target,
          options.pageRange,
          options.flowClip,
          options.projection,
          fallback
        );
  });
}

/**
 * Creates source-flow fallback geometry from a projected body cell fragment.
 *
 * Body cell projection still runs before final page translation, so this helper
 * is deliberately source-flow named. It keeps hit-target fallback range and
 * vertical clipping tied to the same projected cell fragment that body cell
 * paint will later translate.
 *
 * @param cell - Projected body cell in source-flow page space.
 * @returns Source-flow fallback inherited by cell hit targets.
 */
function createQuireTableHitTargetSourceFlowFallback(
  cell: QuireTableCellFragment
): QuireTableHitTargetSourceFlowFallback {
  const cellSlice = summarizeQuireTableCellSourceFlowSlice(cell);

  return {
    semanticCellId: cellSlice.semanticCellId,
    originExplicitCellId: cellSlice.originExplicitCellId,
    explicitCellIds: cellSlice.explicitCellIds,
    originCellPos: cellSlice.originCellPos,
    range: cellSlice.range,
    flowClip: cellSlice.visualFlowClip
  };
}

/**
 * Projects one table hit target when it intersects a page range.
 *
 * @param target - Source hit target in flow coordinates.
 * @param pageRange - Document range owned by the page.
 * @param flowClip - Flow-space page bounds.
 * @param projection - Page-body projection being applied.
 * @param fallback - Source-flow range and clip inherited from a projected cell when the source target range is outside this page.
 * @returns Page-local hit target candidates.
 */
function projectQuireTableHitTarget(
  target: QuireTableHitTarget,
  pageRange: QuireDocumentRange,
  flowClip: QuireSourceFlowClip,
  projection: QuirePageBodyProjection,
  fallback?: QuireTableHitTargetSourceFlowFallback
): readonly QuireTableHitTarget[] {
  const range = intersectQuireDocumentRanges(target.range, pageRange) ??
    fallback?.range ??
    null;
  const targetClip = fallback === undefined
    ? flowClip
    : intersectQuireSourceFlowClips(flowClip, fallback.flowClip);
  const rect = targetClip === null
    ? null
    : clipQuireRectToSourceFlowClip(target.rect, targetClip);

  if (range === null || rect === null) {
    return [];
  }

  return [{
    ...target,
    id: createQuireSplitTablePartId(
      target.id,
      target.range,
      pageRange,
      resolveQuireProjectionOccurrence(projection)
    ),
    semanticCellId: fallback?.semanticCellId ?? target.semanticCellId,
    originExplicitCellId: fallback?.originExplicitCellId ?? target.originExplicitCellId,
    explicitCellIds: fallback?.explicitCellIds ?? target.explicitCellIds,
    originCellPos: fallback?.originCellPos ?? target.originCellPos,
    range,
    rect
  }];
}
