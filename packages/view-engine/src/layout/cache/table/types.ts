import type { QuireTableMap } from "../../../document-profile/types";
import type {
  QuireTableCellContentCacheRequest,
  QuireTableCellBlockFlowLayout,
  QuireTableCellInlineMetricsCacheRequest,
  QuireTableCellInlineMetrics,
  QuireTableGridTrack,
  QuireTableGridTrackCacheRequest,
  QuireTableMeasurementEnvironment,
  QuireTableRowHeightCacheRequest,
  QuireTableSource
} from "@quirekit/layout/table";
import type { QuireBlockLayoutInput } from "../../engine/block-types";

/** Exact source-adaptation identity for one retained Word table. */
export interface QuireTableSourceCacheKey {
  /** Stable layout block id shared with downstream table products. */
  readonly tableId: string;
  /** Exact immutable source identity; changed sources cannot exact-hit this key. */
  readonly sourceIdentity: object;
  /** Absolute source range start represented by the normalized source. */
  readonly rangeFrom: number;
  /** Absolute source range end represented by the normalized source. */
  readonly rangeTo: number;
  /** Table-style registry identity; a registry change must rebuild the source. */
  readonly styleVariant?: string | undefined;
}

/** Request that lazily derives an exact table map. */
export interface QuireTableMapCacheRequest {
  /** Exact immutable table source identity. */
  readonly sourceIdentity: object;
  /** Builds the map after a cache miss. */
  readonly build: () => QuireTableMap;
}

/** Request that lazily derives a normalized table source. */
export interface QuireTableSourceCacheRequest {
  /** Exact source-adaptation identity. */
  readonly key: QuireTableSourceCacheKey;
  /** Map dependency used by source adaptation. */
  readonly tableMap: QuireTableMap;
  /** Builds the normalized source after a cache miss. */
  readonly build: () => QuireTableSource;
}

/** Cumulative diagnostics for one per-view table product cache. */
export interface QuireTableProductCacheCounters {
  /** Exact table-map cache hits. */
  readonly tableMapHits: number;
  /** Exact table-map cache misses. */
  readonly tableMapMisses: number;
  /** Exact normalized-source cache hits. */
  readonly sourceHits: number;
  /** Exact normalized-source cache misses. */
  readonly sourceMisses: number;
  /** Geometry-keyed grid-track cache hits. */
  readonly gridTrackHits: number;
  /** Geometry-keyed grid-track cache misses. */
  readonly gridTrackMisses: number;
  /** Exact semantic-cell measurement cache hits. */
  readonly cellContentHits: number;
  /** Exact semantic-cell measurement cache misses. */
  readonly cellContentMisses: number;
  /** Exact intrinsic cell-metric cache hits. */
  readonly cellInlineMetricHits: number;
  /** Intrinsic cell-metric cache misses. */
  readonly cellInlineMetricMisses: number;
  /** Exact base-row height cache hits. */
  readonly rowHeightHits: number;
  /** Base-row height cache misses. */
  readonly rowHeightMisses: number;
  /** Table product groups evicted after retained owner removal. */
  readonly tableEvictions: number;
}

/** Internal retained table products owned by one mounted view. */
export interface QuireTableProductCache {
  /**
   * Prepares the cache for one shaping and measurement environment.
   *
   * Changed environment facts clear measurement-dependent products while
   * source-derived products remain valid.
   *
   * @param environment - Current snapshot measurement authority.
   * @returns Nothing.
   */
  prepare(environment: QuireTableMeasurementEnvironment): void;
  /**
   * Reads or builds a table map for one exact source node.
   *
   * @param request - Exact source identity and lazy builder.
   * @returns Retained or newly built table map.
   */
  readTableMap(request: QuireTableMapCacheRequest): QuireTableMap;
  /**
   * Reads or builds normalized source adaptation for an exact node and range.
   *
   * @param request - Exact source key, map dependency, and lazy builder.
   * @returns Retained or newly built normalized table source.
   */
  readSource(request: QuireTableSourceCacheRequest): QuireTableSource;
  /**
   * Reads or builds physical grid tracks for normalized columns and geometry.
   *
   * @param request - Grid key and lazy track builder.
   * @returns Retained or newly built physical tracks.
   */
  readGridTracks(
    request: QuireTableGridTrackCacheRequest
  ): readonly QuireTableGridTrack[];
  /**
   * Reads or measures recursive content for one exact semantic cell source.
   *
   * @param request - Cell identity, measurement geometry, and lazy builder.
   * @returns Retained or newly measured cell content.
   */
  readCellContent(
    request: QuireTableCellContentCacheRequest<QuireBlockLayoutInput>
  ): QuireTableCellBlockFlowLayout<QuireBlockLayoutInput>;
  /**
   * Reads or measures intrinsic inline sizes for one exact semantic cell.
   *
   * @param request - Cell identity and lazy intrinsic measurement.
   * @returns Retained or newly measured intrinsic inline sizes.
   */
  readCellInlineMetrics(
    request: QuireTableCellInlineMetricsCacheRequest
  ): QuireTableCellInlineMetrics;
  /**
   * Reads or resolves one base row height from canonical dependencies.
   *
   * @param request - Row identity, dependency signature, and lazy resolver.
   * @returns Retained or newly resolved base row height.
   */
  readRowHeight(request: QuireTableRowHeightCacheRequest): number;
  /**
   * Removes products owned by a table that left retained block flow.
   *
   * @param tableId - Exact retained table owner id.
   * @returns Nothing.
   */
  deleteTable(tableId: string): void;
  /**
   * Reads cumulative cache diagnostics.
   *
   * @returns Current hit and miss counters.
   */
  snapshot(): QuireTableProductCacheCounters;
}
