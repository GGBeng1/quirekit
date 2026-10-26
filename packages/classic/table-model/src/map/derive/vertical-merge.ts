import { createWordTableMapDiagnostic } from "../diagnostics";
import { createSemanticCell } from "./semantic-cell";
import { rangesIntersect } from "../range";
import type {
  MutableSemanticCellRef,
  OpenVerticalMergeChain,
  SemanticResolutionOptions
} from "./internal";
import type { WordTableGridRange } from "../types";

/**
 * Expires chains that did not receive a matching cell in the preceding row.
 *
 * @param openChains - Active range ownership from earlier source rows.
 * @param semanticById - Current semantic rectangles derived from explicit cells.
 * @param rowIndex - Source row about to be resolved, not a page fragment index.
 */
export function closeNonAdjacentChains(
  openChains: Map<string, OpenVerticalMergeChain>,
  semanticById: ReadonlyMap<string, MutableSemanticCellRef>,
  rowIndex: number
): void {
  for (const [key, chain] of openChains) {
    const rect = semanticById.get(chain.semanticCellId)?.rect;
    if (!rect || rect.startRow + rect.rowSpan !== rowIndex) {
      openChains.delete(key);
    }
  }
}

/**
 * Resolves an explicit `vMerge: continue` cell.
 *
 * @param options - Semantic resolution inputs.
 * @returns Owning semantic cell.
 */
export function resolveVerticalContinuation(
  options: SemanticResolutionOptions
): MutableSemanticCellRef {
  const key = `${options.explicitCell.range.startColumn}:${options.explicitCell.range.columnSpan}`;
  const chain = options.openChains.get(key);

  if (!chain) {
    const code = findIntersectingChains(
      options.openChains,
      options.explicitCell.range
    ).length > 0 ? "vmerge-range-mismatch" : "vmerge-orphan-continue";

    options.diagnostics.push(createWordTableMapDiagnostic({
      code,
      message: "Vertical merge continuation has no exact open chain.",
      rowIndex: options.explicitCell.rowIndex,
      cellIndex: options.explicitCell.cellIndex,
      range: options.explicitCell.range,
      explicitCellIds: [options.explicitCell.id]
    }));
    options.explicitCell.role = "malformedContinuation";

    return createSemanticCell(
      options.explicitCell,
      false,
      options.semanticCells,
      options.semanticById
    );
  }

  const semanticCell = options.semanticById.get(chain.semanticCellId);

  if (!semanticCell) {
    options.explicitCell.role = "malformedContinuation";

    return createSemanticCell(
      options.explicitCell,
      false,
      options.semanticCells,
      options.semanticById
    );
  }

  options.explicitCell.role = "verticalContinuation";
  options.explicitCell.semanticCellId = semanticCell.id;
  semanticCell.continuationExplicitCellIds.push(options.explicitCell.id);
  semanticCell.rect = {
    ...semanticCell.rect,
    rowSpan: options.explicitCell.rowIndex - semanticCell.rect.startRow + 1
  };

  reportContinuationDiagnostics(options, chain, semanticCell);

  return semanticCell;
}

/**
 * Finds and closes open vertical merge chains intersecting a range.
 *
 * @param openChains - Mutable open-chain map.
 * @param range - Range used to find chains.
 * @returns Closed chains.
 */
export function closeIntersectingChains(
  openChains: Map<string, OpenVerticalMergeChain>,
  range: WordTableGridRange
): OpenVerticalMergeChain[] {
  const chains = findIntersectingChains(openChains, range);

  for (const chain of chains) {
    openChains.delete(chain.key);
  }

  return chains;
}

/**
 * Finds open vertical merge chains intersecting a range.
 *
 * @param openChains - Open-chain map.
 * @param range - Range used to find chains.
 * @returns Matching open chains.
 */
export function findIntersectingChains(
  openChains: Map<string, OpenVerticalMergeChain>,
  range: WordTableGridRange
): OpenVerticalMergeChain[] {
  return Array.from(openChains.values()).filter((chain) =>
    rangesIntersect(chain.range, range)
  );
}

/**
 * Emits diagnostics for a continuation that attached to an open chain.
 *
 * @param options - Semantic resolution inputs.
 * @param chain - Open chain that owns the continuation.
 * @param semanticCell - Attached semantic cell.
 */
function reportContinuationDiagnostics(
  options: SemanticResolutionOptions,
  chain: OpenVerticalMergeChain,
  semanticCell: MutableSemanticCellRef
): void {
  if (options.explicitCell.hasMeaningfulContent) {
    semanticCell.wellFormed = false;
    options.diagnostics.push(createWordTableMapDiagnostic({
      code: "vmerge-continuation-content",
      message: "Vertical merge continuation contains meaningful content.",
      rowIndex: options.explicitCell.rowIndex,
      cellIndex: options.explicitCell.cellIndex,
      range: options.explicitCell.range,
      explicitCellIds: [options.explicitCell.id],
      semanticCellIds: [semanticCell.id]
    }));
  }

  if (chain.originIsHeader !== options.rowIsHeader) {
    semanticCell.wellFormed = false;
    options.diagnostics.push(createWordTableMapDiagnostic({
      code: "header-body-vmerge-crossing",
      message: "Vertical merge crosses header and body row boundaries.",
      rowIndex: options.explicitCell.rowIndex,
      cellIndex: options.explicitCell.cellIndex,
      range: options.explicitCell.range,
      explicitCellIds: [options.explicitCell.id],
      semanticCellIds: [semanticCell.id]
    }));
  }
}
