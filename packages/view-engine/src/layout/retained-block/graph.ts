import { createQuireLeafFlowCache } from "../cache/leaf-flow";
import type { QuireLayoutBox } from "../engine/types";
import type {
  QuireRetainedBlockLayoutCommit,
  QuireRetainedBlockLayoutGraph,
  QuireRetainedBlockLayoutGraphCounters,
  QuireRetainedBlockLayoutGraphOptions,
  QuireRetainedBlockLayoutRecord,
  QuireRetainedBlockReconcileOptions
} from "./types";
import { projectQuireRetainedBlockLayout } from "./projection";
import {
  countRemovedQuireRetainedBlocks,
  createQuireRetainedFlowHeightEntries,
  extendQuireRetainedBlockHeight,
  resolveQuireRetainedProjectedExtraHeight
} from "./flow";
import {
  createQuireLayoutHeightIndex,
  type QuireLayoutHeightIndex,
  type QuireLayoutHeightIndexEntry
} from "./height-index";
import { reconcileQuireRetainedBlockRecords } from "./record-pass";
import { compareQuireRetainedFullFlow } from "./debug";
import {
  createQuireTableProductCache,
  type QuireTableProductCache
} from "../cache/table";
import {
  createQuireLayoutProviderExecutionLifecycle,
  type QuireLayoutProviderExecutionLifecycle
} from "../providers/lifecycle";

/** Mutable renderer-neutral retained block graph owned by one view. */
class DefaultQuireRetainedBlockLayoutGraph implements QuireRetainedBlockLayoutGraph {
  /** Exact recursive leaf placements isolated to this graph lifecycle. */
  readonly leafFlowCache = createQuireLeafFlowCache();

  /** Renderer-neutral structured products retained with the graph lifecycle. */
  readonly tableProductCache: QuireTableProductCache =
    createQuireTableProductCache();

  /** Provider executions and continuation retained with the graph lifecycle. */
  readonly providerExecutionLifecycle: QuireLayoutProviderExecutionLifecycle =
    createQuireLayoutProviderExecutionLifecycle();

  /** Whether commits run the independent linear flow comparison. */
  private readonly debugCompareFullFlow: boolean;

  /** Last committed records keyed by stable block id. */
  private records = new Map<string, QuireRetainedBlockLayoutRecord>();

  /** Prefix-sum authority for the last committed top-level flow. */
  private heightIndex: QuireLayoutHeightIndex = createQuireLayoutHeightIndex();

  /** Entries represented by the last successful height-index commit. */
  private heightEntries: readonly QuireLayoutHeightIndexEntry[] = [];

  /** Absolute Y origin of the last committed containing flow. */
  private flowOriginY = 0;

  /** Leading spacing before the first indexed block. */
  private leadingSpacing = 0;

  /** Cumulative number of graph commits. */
  private commits = 0;

  /** Cumulative number of reconciled inputs. */
  private reconciledRecords = 0;

  /** Cumulative number of rebuilt records. */
  private rebuiltRecords = 0;

  /** Cumulative number of reused records. */
  private reusedRecords = 0;

  /** Cumulative number of projected records. */
  private projectedRecords = 0;

  /** Cumulative number of removed records. */
  private removedRecords = 0;

  /** Cumulative number of structural height-index rebuilds. */
  private heightIndexRebuilds = 0;

  /** Cumulative number of same-order height-index delta batches. */
  private heightIndexDeltaBatches = 0;

  /** Cumulative number of extents changed through delta batches. */
  private heightIndexUpdatedEntries = 0;

  /** Cumulative number of indexed block-top projection queries. */
  private heightIndexQueries = 0;

  /** Cumulative number of successful debug full-flow comparisons. */
  private debugFlowComparisons = 0;

  /**
   * Creates one retained graph with optional internal debug comparison.
   *
   * @param options - Internal graph diagnostics options.
   */
  constructor(options: QuireRetainedBlockLayoutGraphOptions = {}) {
    this.debugCompareFullFlow = options.debugCompareFullFlow === true;
  }

  /**
   * Reconciles current inputs and projects one atomic flow commit.
   *
   * @param options - Current inputs, geometry, invalidation, and local builder.
   * @returns Retained records and projected layout boxes.
   */
  reconcile(options: QuireRetainedBlockReconcileOptions): QuireRetainedBlockLayoutCommit {
    // Phase 1: reconcile only local records. The provisional absolute origin is
    // consumed exclusively by builders whose provider contracts require it;
    // the resulting record is normalized and never retains this flow position.
    const recordPass = reconcileQuireRetainedBlockRecords(this.records, options);

    // Phase 2: same-order changes become batched Fenwick deltas; structural
    // order changes rebuild the index instead of treating position as identity.
    // The previous entry set is retained only as an exceptional rollback path.
    const heightEntries = createQuireRetainedFlowHeightEntries(
      recordPass.orderedRecords,
      options.children,
      options.blockGap
    );
    const previousHeightEntries = this.heightEntries;
    const heightUpdate = this.heightIndex.reconcile(heightEntries);
    const projectedChildren: QuireLayoutBox[] = [];

    try {
      // Phase 3: absolute document geometry comes only from indexed block tops.
      // Local retained boxes stay unchanged when any preceding extent moves.
      for (let index = 0; index < recordPass.orderedRecords.length; index += 1) {
        const record = recordPass.orderedRecords[index]!;
        const input = options.children[index]!;
        const top = options.y + recordPass.leadingSpacing + this.heightIndex.blockTop(index);
        const projected = projectQuireRetainedBlockLayout(
          record.localBox,
          record.input,
          input,
          options.x,
          top
        );
        if (projected === undefined) {
          throw new Error(`Unable to project retained block record: ${input.id}`);
        }
        const extraHeight = resolveQuireRetainedProjectedExtraHeight(
          input,
          options.children[index + 1]
        );
        projectedChildren.push(extraHeight === 0
          ? projected
          : extendQuireRetainedBlockHeight(projected, extraHeight));
      }

      if (this.debugCompareFullFlow) {
        compareQuireRetainedFullFlow(
          recordPass.orderedRecords,
          options,
          recordPass.leadingSpacing,
          this.heightIndex,
          recordPass.leadingSpacing + this.heightIndex.totalHeight()
        );
      }
    } catch (error) {
      this.heightIndex.reconcile(previousHeightEntries);
      throw error;
    }
    const totalHeight = recordPass.leadingSpacing + this.heightIndex.totalHeight();

    const removedRecords = countRemovedQuireRetainedBlocks(
      this.records,
      recordPass.recordsById
    );
    this.evictRemovedTableProducts(recordPass.recordsById);
    this.records = new Map(recordPass.recordsById);
    this.heightEntries = heightEntries;
    this.flowOriginY = options.y;
    this.leadingSpacing = recordPass.leadingSpacing;
    this.reconciledRecords += recordPass.reconciledRecords;
    this.rebuiltRecords += recordPass.rebuiltRecords;
    this.reusedRecords += recordPass.reusedRecords;
    this.projectedRecords += projectedChildren.length;
    this.removedRecords += removedRecords;
    this.heightIndexQueries += recordPass.orderedRecords.length;
    this.debugFlowComparisons += this.debugCompareFullFlow ? 1 : 0;
    if (heightUpdate.mode === "rebuild") {
      this.heightIndexRebuilds += 1;
    } else if (heightUpdate.mode === "delta") {
      this.heightIndexDeltaBatches += 1;
      this.heightIndexUpdatedEntries += heightUpdate.updatedEntries;
    }
    this.commits += 1;

    return {
      records: recordPass.orderedRecords,
      children: projectedChildren,
      height: totalHeight
    };
  }

  /**
   * Reads cumulative graph diagnostics.
   *
   * @returns Current retained graph counters.
   */
  snapshot(): QuireRetainedBlockLayoutGraphCounters {
    return {
      commits: this.commits,
      reconciledRecords: this.reconciledRecords,
      rebuiltRecords: this.rebuiltRecords,
      reusedRecords: this.reusedRecords,
      projectedRecords: this.projectedRecords,
      removedRecords: this.removedRecords,
      heightIndexRebuilds: this.heightIndexRebuilds,
      heightIndexDeltaBatches: this.heightIndexDeltaBatches,
      heightIndexUpdatedEntries: this.heightIndexUpdatedEntries,
      heightIndexQueries: this.heightIndexQueries,
      debugFlowComparisons: this.debugFlowComparisons,
      providerExecution: this.providerExecutionLifecycle.snapshot(),
      leafFlow: this.leafFlowCache.snapshot()
    };
  }

  /** @inheritdoc */
  blockIndexAtY(y: number): number | undefined {
    return this.heightIndex.blockIndexAtOffset(
      y - this.flowOriginY - this.leadingSpacing
    );
  }

  /** @inheritdoc */
  inspectRecord(id: string): QuireRetainedBlockLayoutRecord | undefined {
    return this.records.get(id);
  }

  /**
   * Evicts table products whose retained block owner left table flow.
   *
   * @param nextRecords - Candidate records accepted by the current commit.
   * @returns Nothing.
   */
  private evictRemovedTableProducts(
    nextRecords: ReadonlyMap<string, QuireRetainedBlockLayoutRecord>
  ): void {
    for (const [id, previous] of this.records) {
      const tableId = previous.tableSnapshot?.tableId;
      if (tableId === undefined) {
        continue;
      }
      const next = nextRecords.get(id);
      if (next?.tableSnapshot?.tableId !== tableId) {
        this.tableProductCache.deleteTable(tableId);
      }
    }
  }
}

/**
 * Creates a renderer-neutral retained block layout graph.
 *
 * @param options - Optional internal debug comparison settings.
 * @returns Empty graph owned by one view instance.
 */
export function createQuireRetainedBlockLayoutGraph(
  options: QuireRetainedBlockLayoutGraphOptions = {}
): QuireRetainedBlockLayoutGraph {
  return new DefaultQuireRetainedBlockLayoutGraph(options);
}
