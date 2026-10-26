import type {
  QuireTableHitTarget,
  QuireTableRowFragment
} from "../../../table";
import type { QuireRepeatedTableHeaderState } from "../../repeated-table-headers";
import {
  clipQuireRectToSourceFlowClip,
  type QuireSourceFlowClip
} from "../source-flow";
import {
  resolveQuireRepeatedHeaderSourceBand,
  translateQuireRepeatedHeaderRectY
} from "./geometry";
import { createQuireRepeatedHeaderTablePartId } from "../table/part-ids";

/** Options for creating repeated table header hit targets. */
export interface QuireRepeatedHeaderHitTargetsOptions {
  /** Source table hit targets in flow coordinates. */
  readonly hitTargets: readonly QuireTableHitTarget[];
  /** Semantic cell ids that are repeated on this page. */
  readonly repeatedSemanticCellIds: ReadonlySet<string>;
  /** Source table row fragments in flow coordinates. */
  readonly rows: readonly QuireTableRowFragment[];
  /** Repeated header state for the projected page. */
  readonly repeatedHeader: QuireRepeatedTableHeaderState | null;
  /** Flow-space band reserved for repeated header fragments. */
  readonly flowClip: QuireSourceFlowClip;
  /** Page occurrence key: the page index, or page and column on multi-column pages. */
  readonly pageIndex: number | string;
}

/**
 * Creates repeated header hit targets in flow coordinates for one page.
 *
 * @param options - Source targets, repeated cell ids, rows, header state, clip, and page index.
 * @returns Repeated header hit targets clipped to the header band.
 */
export function createQuireRepeatedHeaderHitTargets(
  options: QuireRepeatedHeaderHitTargetsOptions
): readonly QuireTableHitTarget[] {
  const sourceBand = resolveQuireRepeatedHeaderSourceBand(
    options.repeatedHeader,
    options.rows
  );

  if (options.repeatedHeader === null || sourceBand === null) {
    return [];
  }

  const deltaY = options.flowClip.top - sourceBand.top;

  return options.hitTargets.flatMap((target) => {
    if (!options.repeatedSemanticCellIds.has(target.semanticCellId)) {
      return [];
    }

    const rect = clipQuireRectToSourceFlowClip(target.rect, sourceBand);

    if (rect === null) {
      return [];
    }

    return [{
      ...target,
      id: createQuireRepeatedHeaderTablePartId(target.id, options.pageIndex),
      isRepeatedHeader: true,
      rect: translateQuireRepeatedHeaderRectY(rect, deltaY)
    }];
  });
}
