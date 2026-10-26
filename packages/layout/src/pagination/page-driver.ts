import type { QuirePageEndInfo } from "./types";
import { paginateQuireMeasuredContainer } from "./container";
import {
  createQuirePaginationCheckpoint,
  findQuirePaginationCheckpointConvergence
} from "./checkpoint";
import { resolveQuirePageGeometryForIndex } from "./geometry";
import {
  commitQuirePaginationCheckpointStream,
  createQuirePaginationPageRecord
} from "./page-driver/checkpoint-stream";
import { prepareQuirePaginationDrive } from "./page-driver/resume";
import { paginateQuireBalancedColumnPage } from "./page-driver/column-page";
import {
  createQuireAcceptedPageFragment,
  resolveQuirePageLeadingBandForPage
} from "./page-driver/index";
import type {
  QuireMeasuredContainerDriveContinuation,
  QuireMeasuredContainerDriveResult,
  QuireMeasuredContainerPageDriveOptions
} from "./page-driver/index";

/**
 * Drives one measured container across pages with the single pagination routine.
 *
 * The driver owns page transitions and the routine owns one page fragment, exactly
 * as in mature page-driven engines (see
 * `docs/research/canvas-pagination-algorithm.md`). Because the driver simply
 * resumes the routine from `nextIndex` on the next page, a container that spills
 * mid-way keeps its continuation page open: the routine continues consuming the
 * following items on that page, so a split paragraph's tail and the next block
 * share a page instead of stranding a lone trailing line.
 *
 * A retained checkpoint stream may supply an unchanged page prefix. After each
 * recomputed page, the driver compares the newly produced boundary with the old
 * stream. Stable item identity plus one proven index/range/flow translation lets
 * the old suffix be translated and reused; geometry or continuation-state changes
 * keep driving pages normally. The checkpoint store never becomes another page
 * owner: page progression and convergence stay in this function.
 *
 * @param options - Container, page geometry, and optional resume/stop window.
 * @returns Page fragments produced this pass and a continuation when paused.
 */
export function driveQuireMeasuredContainerPages(
  options: QuireMeasuredContainerPageDriveOptions
): QuireMeasuredContainerDriveResult {
  const { container, pageGeometry, stopAfterPageIndex } = options;
  const prepared = prepareQuirePaginationDrive(options);
  const { geometryKey, fragments, records, reusePlan } = prepared;
  let startIndex = prepared.startIndex;
  let pageIndex = prepared.pageIndex;
  let isPageTop = prepared.isPageTop;
  let endInfo: QuirePageEndInfo = prepared.endInfo;
  let recomputedPages = 0;

  while (startIndex < container.items.length) {
    const pageStart = createQuirePaginationCheckpoint({
      container,
      nextItemIndex: startIndex,
      pageIndex,
      isPageTop,
      endInfo,
      geometryKey
    });
    if (pageStart === undefined) {
      break;
    }

    const geometry = resolveQuirePageGeometryForIndex(pageGeometry, pageIndex);
    const collectSourceContext =
      options.collectSourceContextForPage?.({ pageIndex, geometry }) ?? true;
    const columnRects = geometry.columnRects;
    const pageLeadingBand = columnRects === undefined
      ? resolveQuirePageLeadingBandForPage(container, startIndex)
      : null;
    const result = columnRects === undefined
      ? paginateQuireMeasuredContainer({
          container,
          startIndex,
          availableHeight: Math.max(
            0,
            geometry.bodyRect.height - (pageLeadingBand?.height ?? 0)
          ),
          isPageTop,
          incomingEndInfo: endInfo,
          collectSourceContext,
          collectSourceFragments: options.collectSourceFragments,
          noteSeparatorHeight: options.noteSeparatorHeight,
          noteContinuationSeparatorHeight: options.noteContinuationSeparatorHeight,
          ...(options.widows === undefined ? {} : { widows: options.widows }),
          ...(options.orphans === undefined ? {} : { orphans: options.orphans })
        })
      : paginateQuireBalancedColumnPage({
          container,
          pageIndex,
          geometry: { ...geometry, columnRects },
          startIndex,
          incomingEndInfo: endInfo,
          collectSourceContext,
          collectSourceFragments: options.collectSourceFragments,
          noteSeparatorHeight: options.noteSeparatorHeight,
          noteContinuationSeparatorHeight: options.noteContinuationSeparatorHeight,
          widows: options.widows,
          orphans: options.orphans
        }, options.pageGeometry) ?? { kind: "backtrack" as const, pull: 0 };

    if (result.kind === "backtrack") {
      // Widow/orphan backtrack is a future slice; stop rather than spin until
      // the parent driver owns a typed previous-page rebuild request.
      break;
    }

    const acceptedFragment = createQuireAcceptedPageFragment({
      container,
      pageIndex,
      geometry,
      startIndex,
      result,
      collectSourceContext,
      collectSourceFragments: options.collectSourceFragments,
      pageLeadingBand
    });
    const pageFragment = "columns" in result
      ? {
          ...acceptedFragment,
          columns: result.columns,
          ...(result.separators.length === 0 ? {} : { columnSeparators: result.separators }),
          ...(result.noteAreaBottom === undefined ? {} : { noteAreaBottom: result.noteAreaBottom })
        }
      : acceptedFragment;
    fragments.push(pageFragment);
    recomputedPages += 1;

    if (result.kind === "done") {
      records.push(createQuirePaginationPageRecord({
        container,
        fragment: pageFragment,
        start: pageStart,
        end: null,
        endItemIndex: result.nextIndex - 1
      }));
      commitQuirePaginationCheckpointStream({
        options,
        geometryKey,
        records,
        recomputedPages,
        suffixPagesReused: 0,
        convergenceAttempted: reusePlan !== null
      });
      break;
    }

    // Indivisible leaf items always advance (place-and-overflow at page top), so a
    // non-advancing spill is pathological; force progress to keep the loop total.
    const nextStartIndex = result.nextIndex > startIndex
      ? result.nextIndex
      : startIndex + 1;
    const nextPageIndex = pageIndex + 1;
    if (nextStartIndex >= container.items.length) {
      records.push(createQuirePaginationPageRecord({
        container,
        fragment: pageFragment,
        start: pageStart,
        end: null,
        endItemIndex: Math.min(container.items.length - 1, result.nextIndex - 1)
      }));
      commitQuirePaginationCheckpointStream({
        options,
        geometryKey,
        records,
        recomputedPages,
        suffixPagesReused: 0,
        convergenceAttempted: reusePlan !== null
      });
      break;
    }

    const resume: QuireMeasuredContainerDriveContinuation = {
      startIndex: nextStartIndex,
      pageIndex: nextPageIndex,
      isPageTop: true,
      endInfo: result.endInfo
    };
    const pageEnd = createQuirePaginationCheckpoint({
      container,
      nextItemIndex: nextStartIndex,
      pageIndex: nextPageIndex,
      isPageTop: true,
      endInfo: result.endInfo,
      geometryKey
    });
    if (pageEnd === undefined) {
      break;
    }
    records.push(createQuirePaginationPageRecord({
      container,
      fragment: pageFragment,
      start: pageStart,
      end: pageEnd,
      endItemIndex: result.nextIndex - 1
    }));

    const convergence = reusePlan === null
      ? null
      : findQuirePaginationCheckpointConvergence({
          checkpoint: pageEnd,
          container,
          previous: reusePlan.previous
        });
    if (convergence !== null) {
      for (let index = 0; index < convergence.suffix.length; index += 1) {
        const record = convergence.suffix[index]!;
        records.push(record);
        fragments.push(record.fragment);
      }
      commitQuirePaginationCheckpointStream({
        options,
        geometryKey,
        records,
        recomputedPages,
        suffixPagesReused: convergence.suffix.length,
        convergenceAttempted: true
      });
      return { fragments, continuation: null };
    }

    startIndex = nextStartIndex;
    endInfo = result.endInfo;
    pageIndex = nextPageIndex;
    isPageTop = true;

    if (stopAfterPageIndex !== undefined && pageIndex > stopAfterPageIndex) {
      return { fragments, continuation: resume };
    }
  }

  return { fragments, continuation: null };
}

export type {
  QuireMeasuredContainerDriveContinuation,
  QuireMeasuredContainerDriveResult,
  QuireMeasuredContainerPageDriveOptions
} from "./page-driver/index";
