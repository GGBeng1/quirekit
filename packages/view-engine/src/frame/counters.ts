import { snapshotQuireLayoutProductCounters } from "../editor-layout/snapshot/reuse/cache";
import { listQuireSectionLayoutGraphs } from "../editor-layout/snapshot/engine";
import type {
  QuireViewEngineFrameCacheAuthority,
  QuireViewEngineFrameCacheCounters
} from "./types";

/**
 * Samples runtime-owned cache counters after all frame phases complete.
 *
 * @param caches - Accepted or transient cache authority used by the frame.
 * @returns Current cache counters.
 */
export function snapshotQuireViewEngineFrameCacheCounters(
  caches: QuireViewEngineFrameCacheAuthority
): QuireViewEngineFrameCacheCounters {
  return {
    layoutProduct: snapshotQuireLayoutProductCounters(caches.retainedBlockGraph),
    retainedBlock: caches.retainedBlockGraph.snapshot(),
    sectionRetainedBlocks: listQuireSectionLayoutGraphs(caches.retainedBlockGraph).map((graph) => graph.snapshot()),
    blockShape: caches.blockShapeCache.snapshot(),
    measuredSource: caches.measuredSourceCache.snapshot(),
    paginationCheckpoint: caches.paginationCheckpointStore.snapshot(),
    displayCommand: caches.displayCommandCache.snapshot()
  };
}
