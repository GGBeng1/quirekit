import type { QuireBlockFlowInput } from "../../block-flow";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireTextMeasurer } from "../../text";
import type { QuireTableCellBlockFlowLayout } from "../content";
import type {
  QuireTableCellInlineMetrics,
  QuireTableGridTrack,
  QuireTableLayoutMode,
  QuireTableSourceColumn
} from "../types";

/** Shaping and measurement authority that validates retained table products. */
export interface QuireTableMeasurementEnvironment {
  /** Text measurer identity selected for the snapshot. */
  readonly textMeasurer: QuireTextMeasurer;
  /** Immutable measurer version captured for the snapshot. */
  readonly textMeasurerVersion: number | undefined;
  /** Resolved default font declaration. */
  readonly font: string;
  /** Default line height used by recursive cell flow. */
  readonly lineHeight: number;
  /** Baseline offset used while shaping text fragments. */
  readonly textBaselineOffset: number;
  /** Selected line-break policy mode. */
  readonly lineBreakMode: string;
  /** Optional line-breaker implementation identity. */
  readonly lineBreakerName?: string | undefined;
}

/** Geometry and normalized-column identity for one grid-track product. */
export interface QuireTableGridTrackCacheKey {
  /** Stable table identity used to bound retained variants. */
  readonly tableId: string;
  /** Declared sizing authority for column dependencies. */
  readonly layoutMode: QuireTableLayoutMode | null;
  /** Normalized columns in source grid order. */
  readonly columns: readonly QuireTableSourceColumn[];
  /** Left edge used by the resolved physical tracks. */
  readonly x: number;
  /** Total width available to the table grid. */
  readonly availableWidth: number;
  /** Resolved separated-border spacing between tracks. */
  readonly cellSpacing: number;
  /** Stable intrinsic metric signature for auto-fit dependencies. */
  readonly inlineMetricsSignature: string | null;
  /** Whether overwide declared tracks shrink to the available width. */
  readonly fitToWidth?: boolean | undefined;
}

/** Request that lazily resolves physical grid tracks. */
export interface QuireTableGridTrackCacheRequest {
  /** Structural and geometry identity for the tracks. */
  readonly key: QuireTableGridTrackCacheKey;
  /** Builds physical tracks after a miss. */
  readonly build: () => readonly QuireTableGridTrack[];
}

/** Exact recursive measurement identity for one semantic table cell. */
export interface QuireTableCellContentCacheKey {
  /** Stable table identity used to scope semantic cell ids. */
  readonly tableId: string;
  /** Stable semantic cell identity within the table. */
  readonly semanticCellId: string;
  /** Exact source cell object identity. */
  readonly sourceIdentity: object;
  /** Exact source content range represented by measured children. */
  readonly sourceRange: QuireDocumentRange;
  /** Resolved content width used by recursive child flow. */
  readonly contentWidth: number;
  /** Default block extent used by recursive child flow. */
  readonly blockHeight: number;
}

/** Request that lazily measures recursive semantic-cell content. */
export interface QuireTableCellContentCacheRequest<
  Input extends QuireBlockFlowInput
> {
  /** Exact semantic-cell measurement identity. */
  readonly key: QuireTableCellContentCacheKey;
  /** Measures recursive cell content after a miss. */
  readonly build: () => QuireTableCellBlockFlowLayout<Input>;
  /**
   * Projects a retained result to a shifted source range when the consumer can
   * preserve every sidecar it owns.
   *
   * @param layout - Retained recursive cell result.
   * @param previousRange - Range represented by the retained result.
   * @param currentRange - Current exact source range.
   * @returns Projected result, or undefined when a rebuild is required.
   */
  readonly project?: (
    layout: QuireTableCellBlockFlowLayout<Input>,
    previousRange: QuireDocumentRange,
    currentRange: QuireDocumentRange
  ) => QuireTableCellBlockFlowLayout<Input> | undefined;
}

/** Exact intrinsic measurement identity for one semantic table cell. */
export interface QuireTableCellInlineMetricsCacheKey {
  /** Stable table identity used to scope semantic cell ids. */
  readonly tableId: string;
  /** Stable semantic cell identity within the table. */
  readonly semanticCellId: string;
  /** Exact source cell object identity. */
  readonly sourceIdentity: object;
}

/** Request that lazily measures intrinsic cell inline sizes. */
export interface QuireTableCellInlineMetricsCacheRequest {
  /** Exact semantic-cell source identity. */
  readonly key: QuireTableCellInlineMetricsCacheKey;
  /** Measures intrinsic sizes with the active text authority. */
  readonly build: (textMeasurer: QuireTextMeasurer) => QuireTableCellInlineMetrics;
}

/** Request that lazily resolves one base row height. */
export interface QuireTableRowHeightCacheRequest {
  /** Stable table identity used to scope source rows. */
  readonly tableId: string;
  /** Zero-based source row index. */
  readonly rowIndex: number;
  /** Canonical signature of row, grid, cell, and measurement dependencies. */
  readonly dependencySignature: string;
  /** Resolves the base row height after a miss. */
  readonly build: () => number;
}

/** Cumulative diagnostics for consumer-neutral table measurements. */
export interface QuireTableMeasurementCacheCounters {
  /** Exact semantic-cell content hits. */
  readonly cellHits: number;
  /** Semantic-cell content misses. */
  readonly cellMisses: number;
  /** Exact intrinsic inline-metric hits. */
  readonly inlineMetricHits: number;
  /** Intrinsic inline-metric misses. */
  readonly inlineMetricMisses: number;
  /** Exact base-row-height hits. */
  readonly rowHits: number;
  /** Base-row-height misses. */
  readonly rowMisses: number;
}
