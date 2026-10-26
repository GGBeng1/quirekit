import type { QuireTableMap } from "../../../document-profile/types";
import {
  QuireTableGridTrackCache,
  QuireTableMeasurementCache,
  type QuireTableCellContentCacheRequest,
  type QuireTableCellInlineMetricsCacheRequest,
  type QuireTableGridTrack,
  type QuireTableGridTrackCacheRequest,
  type QuireTableMeasurementEnvironment,
  type QuireTableRowHeightCacheRequest,
  type QuireTableSource
} from "@quirekit/layout/table";
import type { QuireBlockLayoutInput } from "../../engine/block-types";
import type {
  QuireTableMapCacheRequest,
  QuireTableProductCache,
  QuireTableProductCacheCounters,
  QuireTableSourceCacheRequest
} from "./types";
import {
  createTableSourceVariantKey
} from "./keys";

/** Exact products retained for one immutable table source identity. */
interface QuireTableSourceProducts {
  /** Derived semantic table map. */
  readonly tableMap: QuireTableMap;
  /** Normalized sources keyed by stable table id and exact range. */
  readonly sources: Map<string, QuireTableSource>;
}

/** View-owned aggregate for Word source products and neutral table caches. */
class DefaultQuireTableProductCache implements QuireTableProductCache {
  private readonly productsBySourceIdentity = new WeakMap<object, QuireTableSourceProducts>();
  private readonly gridTracks = new QuireTableGridTrackCache();
  private readonly measurements = new QuireTableMeasurementCache<
    QuireBlockLayoutInput
  >();
  private tableMapHits = 0;
  private tableMapMisses = 0;
  private sourceHits = 0;
  private sourceMisses = 0;
  private tableEvictions = 0;

  /** @inheritdoc */
  prepare(environment: QuireTableMeasurementEnvironment): void {
    this.measurements.prepare(environment);
  }

  /** @inheritdoc */
  readTableMap(request: QuireTableMapCacheRequest): QuireTableMap {
    const retained = this.productsBySourceIdentity.get(request.sourceIdentity);
    if (retained !== undefined) {
      this.tableMapHits += 1;
      return retained.tableMap;
    }

    const tableMap = request.build();
    this.productsBySourceIdentity.set(request.sourceIdentity, {
      tableMap,
      sources: new Map()
    });
    this.tableMapMisses += 1;
    return tableMap;
  }

  /** @inheritdoc */
  readSource(request: QuireTableSourceCacheRequest): QuireTableSource {
    const products = this.readNodeProducts(request);
    const sourceKey = createTableSourceVariantKey(request);
    const retained = products.sources.get(sourceKey);
    if (retained !== undefined) {
      this.sourceHits += 1;
      return retained;
    }

    const source = request.build();
    products.sources.set(sourceKey, source);
    this.sourceMisses += 1;
    return source;
  }

  /** @inheritdoc */
  readGridTracks(
    request: QuireTableGridTrackCacheRequest
  ): readonly QuireTableGridTrack[] {
    return this.gridTracks.read(request);
  }

  /** @inheritdoc */
  readCellContent(
    request: QuireTableCellContentCacheRequest<QuireBlockLayoutInput>
  ): ReturnType<QuireTableProductCache["readCellContent"]> {
    return this.measurements.readCell(request);
  }

  /** @inheritdoc */
  readCellInlineMetrics(
    request: QuireTableCellInlineMetricsCacheRequest
  ): ReturnType<QuireTableProductCache["readCellInlineMetrics"]> {
    return this.measurements.readInlineMetrics(request);
  }

  /** @inheritdoc */
  readRowHeight(request: QuireTableRowHeightCacheRequest): number {
    return this.measurements.readRow(request);
  }

  /** @inheritdoc */
  deleteTable(tableId: string): void {
    const removedGrid = this.gridTracks.deleteTable(tableId);
    const removedMeasurements = this.measurements.deleteTable(tableId);
    if (removedGrid || removedMeasurements) {
      this.tableEvictions += 1;
    }
  }

  /** @inheritdoc */
  snapshot(): QuireTableProductCacheCounters {
    const measurements = this.measurements.snapshot();
    const gridTracks = this.gridTracks.snapshot();
    return {
      tableMapHits: this.tableMapHits,
      tableMapMisses: this.tableMapMisses,
      sourceHits: this.sourceHits,
      sourceMisses: this.sourceMisses,
      gridTrackHits: gridTracks.hits,
      gridTrackMisses: gridTracks.misses,
      cellContentHits: measurements.cellHits,
      cellContentMisses: measurements.cellMisses,
      cellInlineMetricHits: measurements.inlineMetricHits,
      cellInlineMetricMisses: measurements.inlineMetricMisses,
      rowHeightHits: measurements.rowHits,
      rowHeightMisses: measurements.rowMisses,
      tableEvictions: this.tableEvictions
    };
  }

  /**
   * Resolves node products without accepting a mismatched map dependency.
   *
   * @param request - Source request carrying exact node and map identities.
   * @returns Mutable products retained for the source node.
   */
  private readNodeProducts(
    request: QuireTableSourceCacheRequest
  ): QuireTableSourceProducts {
    const retained = this.productsBySourceIdentity.get(request.key.sourceIdentity);
    if (retained !== undefined) {
      if (retained.tableMap !== request.tableMap) {
        throw new Error("Table source cache received a non-canonical map dependency.");
      }
      return retained;
    }

    const products = {
      tableMap: request.tableMap,
      sources: new Map<string, QuireTableSource>()
    };
    this.productsBySourceIdentity.set(request.key.sourceIdentity, products);
    return products;
  }
}

/**
 * Creates one table product aggregate owned by a mounted view.
 *
 * @returns Empty table product cache.
 */
export function createQuireTableProductCache(): QuireTableProductCache {
  return new DefaultQuireTableProductCache();
}
