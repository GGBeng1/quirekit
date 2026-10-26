import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";
import { paginateQuireMeasuredContainer } from "../container";
import type {
  QuireMeasuredContainer,
  QuireMeasuredContainerAcceptedResult,
  QuireMeasuredContainerSourceFragment
} from "../container";
import type { QuireResolvedPageGeometry } from "../geometry";
import type { QuirePageColumnFragment, QuirePageEndInfo, QuirePageFragment } from "../types";
import {
  createQuireAcceptedPageFragment,
  resolveQuirePageLeadingBandForPage
} from "./page-fragment";

/** Inputs for filling the columns of one page. */
export interface QuireColumnPageOptions {
  /** Measured container being driven across pages. */
  readonly container: QuireMeasuredContainer;
  /** Page index assigned by the page driver. */
  readonly pageIndex: number;
  /** Resolved page geometry carrying at least two column rectangles. */
  readonly geometry: QuireResolvedPageGeometry & { readonly columnRects: readonly QuireRect[] };
  /** First measured item placed on the page. */
  readonly startIndex: number;
  /** Resume state carried into the page. */
  readonly incomingEndInfo: QuirePageEndInfo;
  /** Whether accepted results carry source-flow context. */
  readonly collectSourceContext: boolean;
  /** Whether collected context includes query fragments. */
  readonly collectSourceFragments?: boolean | undefined;
  /** Band height drawn above a column's first note. */
  readonly noteSeparatorHeight?: number | undefined;
  /** Band height above notes continued from the previous column or page. */
  readonly noteContinuationSeparatorHeight?: number | undefined;
  /** Whether notes sit below the column band instead of consuming column height. */
  readonly notesBelowFlow?: boolean | undefined;
  /** Widow policy forwarded to every column. */
  readonly widows?: number | undefined;
  /** Orphan policy forwarded to every column. */
  readonly orphans?: number | undefined;
}

/** Accepted page-level result merged from the page's columns. */
export interface QuireColumnPageResult extends QuireMeasuredContainerAcceptedResult {
  /** `done` when the container is exhausted on this page, otherwise `spill`. */
  readonly kind: "done" | "spill";
  /** Columns that accepted content, in flow order. */
  readonly columns: readonly QuirePageColumnFragment[];
}

/**
 * Fills one page column by column with the single measured-container routine.
 *
 * Each column receives the full column height and starts as a fresh top, so the
 * routine's page-top rules (dropped space before, keep policies, widow/orphan)
 * apply identically at column and page boundaries. A forced page break ends the
 * page and leaves the remaining columns empty.
 *
 * @param options - Container, page geometry, and resume state.
 * @returns Merged page result plus the accepted columns, or null when a column requested backtracking.
 */
export function paginateQuireColumnPage(
  options: QuireColumnPageOptions
): QuireColumnPageResult | null {
  const { container, geometry } = options;
  const items = container.items;
  const columns: QuirePageColumnFragment[] = [];
  let startIndex = options.startIndex;
  let endInfo = options.incomingEndInfo;
  let done = false;

  for (let columnIndex = 0; columnIndex < geometry.columnRects.length; columnIndex += 1) {
    const columnRect = geometry.columnRects[columnIndex]!;
    const leadingBand = resolveQuirePageLeadingBandForPage(container, startIndex);
    const result = paginateQuireMeasuredContainer({
      container,
      startIndex,
      availableHeight: Math.max(0, columnRect.height - (leadingBand?.height ?? 0)),
      isPageTop: true,
      incomingEndInfo: endInfo,
      collectSourceContext: options.collectSourceContext,
      collectSourceFragments: options.collectSourceFragments,
      noteSeparatorHeight: options.noteSeparatorHeight,
      noteContinuationSeparatorHeight: options.noteContinuationSeparatorHeight,
      notesBelowFlow: options.notesBelowFlow,
      ...(options.widows === undefined ? {} : { widows: options.widows }),
      ...(options.orphans === undefined ? {} : { orphans: options.orphans })
    });
    if (result.kind === "backtrack") {
      return null;
    }

    const column = createQuireAcceptedPageFragment({
      container,
      pageIndex: options.pageIndex,
      geometry: { pageRect: geometry.pageRect, bodyRect: columnRect },
      startIndex,
      result,
      collectSourceContext: options.collectSourceContext,
      collectSourceFragments: options.collectSourceFragments,
      pageLeadingBand: leadingBand
    });
    columns.push(toQuirePageColumnFragment(column, columnIndex));
    // Resume from the flow's own end state: a leading band (a repeated table header) belongs to
    // this column only, as on single-column pages, and must not carry into later columns.
    endInfo = result.endInfo;

    if (result.kind === "done") {
      done = true;
      startIndex = result.nextIndex;
      break;
    }

    // Indivisible items always advance, so a non-advancing spill is forced
    // forward to keep the column loop total, as the page driver does.
    startIndex = result.nextIndex > startIndex ? result.nextIndex : startIndex + 1;
    if (startIndex >= items.length) {
      done = true;
      break;
    }
    if (items[startIndex - 1]?.breakAfter === "page" || items[startIndex]?.breakBefore === "page") {
      break;
    }
  }

  return mergeQuireColumnPage(columns, startIndex, endInfo, done);
}

/**
 * Narrows an accepted page fragment to the column fields.
 *
 * @param fragment - Fragment created against one column rectangle.
 * @param columnIndex - Zero-based column index.
 * @returns Column fragment.
 */
function toQuirePageColumnFragment(
  fragment: QuirePageFragment,
  columnIndex: number
): QuirePageColumnFragment {
  return {
    columnIndex,
    range: fragment.range,
    bodyRect: fragment.bodyRect,
    rect: fragment.rect,
    endInfo: fragment.endInfo,
    ...(fragment.sourceFlowY === undefined ? {} : { sourceFlowY: fragment.sourceFlowY }),
    ...(fragment.sourceFlowHeight === undefined
      ? {}
      : { sourceFlowHeight: fragment.sourceFlowHeight }),
    ...(fragment.sourceFragments === undefined ? {} : { sourceFragments: fragment.sourceFragments }),
    ...(fragment.notes === undefined ? {} : { notes: fragment.notes, noteAreaHeight: fragment.noteAreaHeight })
  };
}

/**
 * Merges column results into the page-level accepted result.
 *
 * Columns consume consecutive container items, so the page range and source-flow
 * band are the contiguous span from the first column's start to the last column's end.
 *
 * @param columns - Accepted columns in flow order.
 * @param nextIndex - Item index where the next page resumes.
 * @param endInfo - Resume state after the last column.
 * @param done - Whether the container is exhausted.
 * @returns Merged page result.
 */
function mergeQuireColumnPage(
  columns: readonly QuirePageColumnFragment[],
  nextIndex: number,
  endInfo: QuirePageEndInfo,
  done: boolean
): QuireColumnPageResult {
  const first = columns[0]!;
  const last = columns[columns.length - 1]!;
  const range: QuireDocumentRange = { from: first.range.from, to: last.range.to };
  const sourceFragments: QuireMeasuredContainerSourceFragment[] = [];
  let sourceFlowTop = Number.POSITIVE_INFINITY;
  let sourceFlowBottom = Number.NEGATIVE_INFINITY;
  let consumedHeight = 0;

  for (const column of columns) {
    consumedHeight = Math.max(consumedHeight, column.rect.height);
    if (column.sourceFlowY !== undefined && column.sourceFlowHeight !== undefined) {
      sourceFlowTop = Math.min(sourceFlowTop, column.sourceFlowY);
      sourceFlowBottom = Math.max(sourceFlowBottom, column.sourceFlowY + column.sourceFlowHeight);
    }
    if (column.sourceFragments !== undefined) {
      sourceFragments.push(...column.sourceFragments);
    }
  }

  return {
    kind: done ? "done" : "spill",
    range,
    consumedHeight,
    nextIndex,
    endInfo,
    columns,
    ...(sourceFlowTop === Number.POSITIVE_INFINITY
      ? {}
      : { sourceFlowTop, sourceFlowBottom }),
    ...(sourceFragments.length === 0 ? {} : { sourceFragments })
  };
}

/** Height tolerance, in CSS pixels, at which column balancing stops searching. */
const balanceTolerance = 0.5;

/**
 * Balances the columns of a page whose content is already known to fit.
 *
 * Searches for the smallest common column height that still places every
 * remaining item, so the content splits as evenly as the item boundaries allow.
 * The column routine is monotonic in height, which keeps the bisection sound.
 *
 * @param options - Inputs that produced `fitted`.
 * @param fitted - Page result at the full column height, which must be `done`.
 * @param accepts - Extra admission test for a candidate and its column height.
 * @returns Balanced page result and the column height it uses.
 */
export function balanceQuireColumnPage(
  options: QuireColumnPageOptions,
  fitted: QuireColumnPageResult,
  accepts: (candidate: QuireColumnPageResult, height: number) => boolean = () => true
): { readonly result: QuireColumnPageResult; readonly height: number } {
  const fullHeight = options.geometry.columnRects[0]!.height;
  let low = 0;
  let high = fullHeight;
  let best = { result: fitted, height: fullHeight };

  while (high - low > balanceTolerance) {
    const height = (low + high) / 2;
    const candidate = paginateQuireColumnPage({
      ...options,
      geometry: {
        ...options.geometry,
        columnRects: options.geometry.columnRects.map((rect) => ({ ...rect, height }))
      }
    });
    if (candidate?.kind === "done" && accepts(candidate, height)) {
      best = { result: candidate, height };
      high = height;
    } else {
      low = height;
    }
  }
  return best;
}

/**
 * Places separators midway between each non-empty column and its predecessor.
 *
 * @param columnRects - Column rectangles of the page.
 * @param columns - Columns that accepted content.
 * @param height - Separator height: the column height used on this page.
 * @returns Zero-width separator rectangles.
 */
export function createQuireColumnSeparators(
  columnRects: readonly QuireRect[],
  columns: readonly QuirePageColumnFragment[],
  height: number
): readonly QuireRect[] {
  return columns.slice(1).map((column) => {
    const previous = columnRects[column.columnIndex - 1]!;
    const current = columnRects[column.columnIndex]!;
    return {
      x: (previous.x + previous.width + current.x) / 2,
      y: current.y,
      width: 0,
      height
    };
  });
}
