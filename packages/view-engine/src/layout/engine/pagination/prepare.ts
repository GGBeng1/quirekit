import { doesQuireRectIntersectAny, normalizeQuirePositiveAreaRects } from "@quirekit/renderer";
import { driveQuireMeasuredContainerPages, readQuirePreparedPaginationResult } from "@quirekit/layout/pagination";
import type { QuireLayoutDocument } from "../types";
import { traceQuireLayoutPhase } from "../trace";
import { buildQuireBodyMeasuredContainer } from "./measured-source";
import { createQuirePaginationGeometryKey } from "./geometry-key";
import { createQuirePaginatedDocumentRect } from "./document-rect";
import { omitQuirePageSourceFragments } from "./prepared-pages";
import { attachQuireMeasuredContainerNotes, createQuireNotesKey } from "./notes";
import type { QuireLayoutDocumentPaginationOptions } from "./types";

/**
 * Prepares page fragments while retaining the document's infinite-flow source tree.
 *
 * The page driver remains the sole pagination owner. Omitting projection clips
 * retains every accepted page's source flow so any later viewport can project
 * without repeating measured-source conversion or page driving. Supplying clips
 * preserves the compatibility entry's selective source-context collection.
 *
 * @param options - Infinite-flow document, page policy, and retained pagination inputs.
 * @returns Document with full page geometry and unchanged source boxes and anchors.
 */
export function prepareQuireLayoutDocumentPagination(
  options: QuireLayoutDocumentPaginationOptions
): QuireLayoutDocument {
  const trace = options.trace;
  const projectionClipRects = normalizeQuirePositiveAreaRects(
    options.projectionClipRects
  );
  // Note heights change pagination without touching body items, so they join
  // the retained-page cache identity.
  const notesKey = createQuireNotesKey(options);
  const paginationGeometryKey = createQuirePaginationGeometryKey({
    pageGeometry: options.pageGeometry,
    widows: options.widows,
    orphans: options.orphans,
    collectSourceFragments: options.collectSourceFragments,
    projectionClipRects
  }) + notesKey;
  const preparedPaginationGeometryKey = createQuirePaginationGeometryKey({
    pageGeometry: options.pageGeometry,
    widows: options.widows,
    orphans: options.orphans
  }) + notesKey;
  // Source conversion and page acceptance consume infinite-flow coordinates;
  // no viewport translation may mutate or replace those retained inputs.
  const container = traceQuireLayoutPhase(trace, "layout:paginate:measured-source", () =>
    attachQuireMeasuredContainerNotes(buildQuireBodyMeasuredContainer(
      options.document.children,
      options.measuredSourceCache,
      options.layoutDirtyRange?.changedRange
    ), options.notes));
  const preparedPages = options.paginationCheckpointStore === undefined
    ? undefined
    : readQuirePreparedPaginationResult(
        options.paginationCheckpointStore,
        container,
        preparedPaginationGeometryKey
      );
  // Background jobs retain full query provenance under their existing exact
  // input key. Canonical consumers may drop that optional list without a drive
  // or source-list traversal; the prepared authority remains unchanged.
  const preparedPagesForPolicy = preparedPages !== undefined && options.collectSourceFragments === false
    ? preparedPages.map(omitQuirePageSourceFragments)
    : preparedPages;
  const pages = preparedPagesForPolicy ?? traceQuireLayoutPhase(
    trace,
    "layout:paginate:drive",
    () => driveQuireMeasuredContainerPages({
      container,
      pageGeometry: options.pageGeometry,
      collectSourceFragments: options.collectSourceFragments,
      noteSeparatorHeight: options.noteSeparatorHeight,
      noteContinuationSeparatorHeight: options.noteContinuationSeparatorHeight,
      ...(options.widows === undefined ? {} : { widows: options.widows }),
      ...(options.orphans === undefined ? {} : { orphans: options.orphans }),
      ...(projectionClipRects === undefined
        ? {}
        : {
            collectSourceContextForPage: ({ geometry }) =>
              doesQuireRectIntersectAny(
                geometry.pageRect,
                projectionClipRects
              )
          }),
      ...(options.layoutDirtyRange === undefined || options.layoutDirtyRange === null
        ? {}
        : { dirtyRange: options.layoutDirtyRange.changedRange }),
      ...(options.paginationCheckpointStore === undefined
        ? {}
        : {
            paginationCheckpointStore: options.paginationCheckpointStore,
            paginationGeometryKey
          })
    }).fragments
  );
  const rect = traceQuireLayoutPhase(trace, "layout:paginate:document-rect", () =>
    createQuirePaginatedDocumentRect(options.document.rect, pages));

  return { ...options.document, rect, pages };
}
