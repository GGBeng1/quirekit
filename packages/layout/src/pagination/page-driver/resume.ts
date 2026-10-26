import type { QuirePageEndInfo, QuirePageFragment } from "../types";
import {
  getQuirePaginationCheckpointEndInfo,
  type QuirePaginationCheckpointReusePlan,
  type QuirePaginationPageRecord
} from "../checkpoint";
import type { QuireMeasuredContainerPageDriveOptions } from "./types";

/** Initial mutable state for one page-driver pass. */
export interface QuirePreparedPaginationDrive {
  /** Geometry and pagination-policy key. */
  readonly geometryKey: string;
  /** Reused prefix fragments followed by newly produced pages. */
  readonly fragments: QuirePageFragment[];
  /** Reused prefix records followed by newly produced checkpoints. */
  readonly records: QuirePaginationPageRecord[];
  /** Previous stream available for downstream convergence. */
  readonly reusePlan: QuirePaginationCheckpointReusePlan | null;
  /** First measured item to paginate. */
  readonly startIndex: number;
  /** First page index to produce. */
  readonly pageIndex: number;
  /** Whether the first produced fragment starts at a page top. */
  readonly isPageTop: boolean;
  /** Continuation state entering the first produced page. */
  readonly endInfo: QuirePageEndInfo;
}

/**
 * Prepares prefix reuse and the authoritative resume cursor for a page drive.
 *
 * @param options - Page-driver options.
 * @returns Initial fragments, records, previous stream, and resume state.
 */
export function prepareQuirePaginationDrive(
  options: QuireMeasuredContainerPageDriveOptions
): QuirePreparedPaginationDrive {
  // Collection policy changes retained page products, even when pagination
  // geometry is unchanged. Isolate it independently of a caller's geometry key.
  const baseGeometryKey = options.paginationGeometryKey ?? "";
  const geometryKey = options.collectSourceFragments === false
    ? `${baseGeometryKey}|source-fragments:off`
    : baseGeometryKey;
  const canReadCheckpoints =
    options.resume === undefined &&
    options.stopAfterPageIndex === undefined &&
    options.dirtyRange !== undefined &&
    options.dirtyRange !== null;
  const reusePlan = canReadCheckpoints
    ? options.paginationCheckpointStore?.read({
        container: options.container,
        dirtyRange: options.dirtyRange!,
        geometryKey
      }) ?? null
    : null;
  const records = reusePlan === null ? [] : [...reusePlan.prefix];
  const fragments = records.map((record) => record.fragment);
  const retainedResume = reusePlan?.resume;

  return {
    geometryKey,
    fragments,
    records,
    reusePlan,
    startIndex: retainedResume?.nextItem.index ?? options.resume?.startIndex ?? 0,
    pageIndex: retainedResume?.pageIndex ?? options.resume?.pageIndex ?? 0,
    isPageTop: retainedResume?.isPageTop ?? options.resume?.isPageTop ?? true,
    endInfo: retainedResume === undefined
      ? options.resume?.endInfo ?? { openMarks: [], openNodes: [] }
      : getQuirePaginationCheckpointEndInfo(retainedResume)
  };
}
