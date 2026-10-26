import { getRangeKey } from "./ids";
import { createSemanticCell } from "./semantic-cell";
import {
  closeIntersectingChains,
  resolveVerticalContinuation
} from "./vertical-merge";
import type {
  MutableSemanticCellRef,
  SemanticResolutionOptions
} from "./internal";

/**
 * Resolves or creates the semantic cell that owns an explicit cell.
 *
 * @param options - Semantic resolution inputs.
 * @returns Mutable semantic cell ref.
 */
export function resolveSemanticCell(
  options: SemanticResolutionOptions
): MutableSemanticCellRef {
  if (options.explicitCell.vMerge === "continue") {
    return resolveVerticalContinuation(options);
  }

  // A normal cell or a new restart terminates prior-row ownership. Only
  // continuation cells claim an existing chain and require range validation.
  closeIntersectingChains(
    options.openChains,
    options.explicitCell.range
  );

  const semanticCell = createSemanticCell(
    options.explicitCell,
    true,
    options.semanticCells,
    options.semanticById
  );

  if (options.explicitCell.vMerge === "restart") {
    const key = getRangeKey(options.explicitCell.range);

    options.openChains.set(key, {
      key,
      range: options.explicitCell.range,
      semanticCellId: semanticCell.id,
      originIsHeader: options.rowIsHeader
    });
  }

  return semanticCell;
}
