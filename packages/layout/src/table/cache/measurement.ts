import type { QuireBlockFlowInput } from "../../block-flow";
import type { QuireTableCellInlineMetrics } from "../types";
import type {
  QuireTableCellContentCacheRequest,
  QuireTableCellInlineMetricsCacheRequest,
  QuireTableMeasurementCacheCounters,
  QuireTableMeasurementEnvironment,
  QuireTableRowHeightCacheRequest
} from "./types";
import { isSameQuireTableMeasurementEnvironment } from "./environment";

/** Consumer-neutral cache for table cell, intrinsic, and row measurements. */
export class QuireTableMeasurementCache<
  Input extends QuireBlockFlowInput
> {
  private readonly inlineMetricsByTable = new Map<
    string,
    Map<string, {
      readonly sourceIdentity: object;
      readonly metrics: QuireTableCellInlineMetrics;
    }>
  >();
  private readonly cellContentByTable = new Map<
    string,
    Map<string, {
      readonly sourceIdentity: object;
      readonly sourceRange: QuireTableCellContentCacheRequest<Input>["key"]["sourceRange"];
      readonly contentWidth: number;
      readonly blockHeight: number;
      readonly layout: ReturnType<QuireTableCellContentCacheRequest<Input>["build"]>;
    }>
  >();
  private readonly rowHeightsByTable = new Map<
    string,
    Map<number, {
      readonly dependencySignature: string;
      readonly height: number;
    }>
  >();
  private environment: QuireTableMeasurementEnvironment | undefined;
  private cellHits = 0;
  private cellMisses = 0;
  private inlineMetricHits = 0;
  private inlineMetricMisses = 0;
  private rowHits = 0;
  private rowMisses = 0;

  /**
   * Clears measurement products when shaping authority changes.
   *
   * @param environment - Current snapshot measurement authority.
   */
  prepare(environment: QuireTableMeasurementEnvironment): void {
    if (isSameQuireTableMeasurementEnvironment(this.environment, environment)) {
      return;
    }
    this.environment = environment;
    this.cellContentByTable.clear();
    this.inlineMetricsByTable.clear();
    this.rowHeightsByTable.clear();
  }

  /**
   * Reads or measures intrinsic inline sizes for one exact semantic cell.
   *
   * @param request - Exact source identity and lazy metric builder.
   * @returns Retained or newly measured intrinsic sizes.
   */
  readInlineMetrics(
    request: QuireTableCellInlineMetricsCacheRequest
  ): QuireTableCellInlineMetrics {
    const environment = this.environment;
    if (environment === undefined) {
      throw new Error("Table measurement cache must be prepared before use.");
    }
    let cells = this.inlineMetricsByTable.get(request.key.tableId);
    const retained = cells?.get(request.key.semanticCellId);
    if (retained?.sourceIdentity === request.key.sourceIdentity) {
      this.inlineMetricHits += 1;
      return retained.metrics;
    }

    const metrics = request.build(environment.textMeasurer);
    if (cells === undefined) {
      cells = new Map();
      this.inlineMetricsByTable.set(request.key.tableId, cells);
    }
    cells.set(request.key.semanticCellId, {
      sourceIdentity: request.key.sourceIdentity,
      metrics
    });
    this.inlineMetricMisses += 1;
    return metrics;
  }

  /**
   * Reads or measures recursive content for one exact semantic cell.
   *
   * @param request - Exact source, geometry, projection, and lazy builder.
   * @returns Retained, projected, or newly measured cell content.
   */
  readCell(
    request: QuireTableCellContentCacheRequest<Input>
  ): ReturnType<QuireTableCellContentCacheRequest<Input>["build"]> {
    const key = request.key;
    let cells = this.cellContentByTable.get(key.tableId);
    const retained = cells?.get(key.semanticCellId);
    if (
      retained !== undefined
      && retained.sourceIdentity === key.sourceIdentity
      && retained.contentWidth === key.contentWidth
      && retained.blockHeight === key.blockHeight
    ) {
      const layout = isSameRange(retained.sourceRange, key.sourceRange)
        ? retained.layout
        : request.project?.(retained.layout, retained.sourceRange, key.sourceRange);
      if (layout !== undefined) {
        this.cellHits += 1;
        return layout;
      }
    }

    const layout = request.build();
    if (cells === undefined) {
      cells = new Map();
      this.cellContentByTable.set(key.tableId, cells);
    }
    cells.set(key.semanticCellId, {
      sourceIdentity: key.sourceIdentity,
      sourceRange: key.sourceRange,
      contentWidth: key.contentWidth,
      blockHeight: key.blockHeight,
      layout
    });
    this.cellMisses += 1;
    return layout;
  }

  /**
   * Reads or resolves one base row height.
   *
   * @param request - Source row and canonical dependency signature.
   * @returns Retained or newly resolved row height.
   */
  readRow(request: QuireTableRowHeightCacheRequest): number {
    let rows = this.rowHeightsByTable.get(request.tableId);
    const retained = rows?.get(request.rowIndex);
    if (retained?.dependencySignature === request.dependencySignature) {
      this.rowHits += 1;
      return retained.height;
    }

    const height = request.build();
    if (rows === undefined) {
      rows = new Map();
      this.rowHeightsByTable.set(request.tableId, rows);
    }
    rows.set(request.rowIndex, {
      dependencySignature: request.dependencySignature,
      height
    });
    this.rowMisses += 1;
    return height;
  }

  /**
   * Removes measurement products for one retained table owner.
   *
   * @param tableId - Exact retained table identity.
   * @returns Whether any product group was removed.
   */
  deleteTable(tableId: string): boolean {
    const removedCells = this.cellContentByTable.delete(tableId);
    const removedInlineMetrics = this.inlineMetricsByTable.delete(tableId);
    const removedRows = this.rowHeightsByTable.delete(tableId);
    return removedCells || removedInlineMetrics || removedRows;
  }

  /**
   * Reads cumulative measurement diagnostics.
   *
   * @returns Current hit and miss counters.
   */
  snapshot(): QuireTableMeasurementCacheCounters {
    return {
      cellHits: this.cellHits,
      cellMisses: this.cellMisses,
      inlineMetricHits: this.inlineMetricHits,
      inlineMetricMisses: this.inlineMetricMisses,
      rowHits: this.rowHits,
      rowMisses: this.rowMisses
    };
  }
}

/**
 * Compares exact document ranges.
 *
 * @param left - Retained range.
 * @param right - Current range.
 * @returns Whether both boundaries match.
 */
function isSameRange(
  left: { readonly from: number; readonly to: number },
  right: { readonly from: number; readonly to: number }
): boolean {
  return left.from === right.from && left.to === right.to;
}
