import { describe, expect, it } from "vitest";
import { createQuirePaginationQueryIndex } from "./query-index";
import type { QuirePageFragment } from "./types";
import type { QuireMeasuredContainerSourceFragment } from "./container";

describe("pagination query index", () => {
  it("sorts pages and finds fragments by page index", () => {
    const pages = [
      createPageFragment(2, 8, 12),
      createPageFragment(0, 0, 4),
      createPageFragment(1, 4, 8)
    ];
    const index = createQuirePaginationQueryIndex(pages);

    expect(index.pages.map((page) => page.pageIndex)).toEqual([0, 1, 2]);
    expect(index.findPageByIndex(1)).toMatchObject({
      pageIndex: 1,
      range: { from: 4, to: 8 }
    });
    expect(index.findPageByIndex(9)).toBeNull();
  });

  it("finds the page that owns a document position", () => {
    const index = createQuirePaginationQueryIndex([
      createPageFragment(0, 0, 4),
      createPageFragment(1, 4, 8)
    ]);

    expect(index.findPageAtDocumentPosition(2)).toMatchObject({ pageIndex: 0 });
    expect(index.findPageAtDocumentPosition(6)).toMatchObject({ pageIndex: 1 });
    expect(index.findPageAtDocumentPosition(4, -1)).toMatchObject({ pageIndex: 0 });
    expect(index.findPageAtDocumentPosition(4, 1)).toMatchObject({ pageIndex: 1 });
    expect(index.findPageAtDocumentPosition(12)).toBeNull();
  });

  it("finds pages intersecting a document range", () => {
    const index = createQuirePaginationQueryIndex([
      createPageFragment(0, 0, 4),
      createPageFragment(1, 4, 8),
      createPageFragment(2, 8, 12)
    ]);

    expect(index.findPagesIntersectingRange({ from: 3, to: 10 })
      .map((page) => page.pageIndex)).toEqual([0, 1, 2]);
    expect(index.findPagesIntersectingRange({ from: 4, to: 8 })
      .map((page) => page.pageIndex)).toEqual([1]);
    expect(index.findPagesIntersectingRange({ from: 4, to: 4 })
      .map((page) => page.pageIndex)).toEqual([1]);
    expect(index.findPagesIntersectingRange({ from: 10, to: 3 })).toEqual([]);
  });

  it("finds accepted source fragments by page index", () => {
    const index = createQuirePaginationQueryIndex([
      createPageFragment(0, 0, 20, [
        sourceFragment("paragraph-1", 2, 6, 0, 18)
      ]),
      createPageFragment(1, 10, 30, [
        sourceFragment("cell-1", 12, 16, 18, 36)
      ])
    ]);

    expect(index.findSourceFragmentsByPageIndex(0)).toEqual([
      sourceFragment("paragraph-1", 2, 6, 0, 18)
    ]);
    expect(index.findSourceFragmentsByPageIndex(9)).toEqual([]);
  });

  it("finds source fragments by fragment ranges instead of page envelopes", () => {
    const index = createQuirePaginationQueryIndex([
      createPageFragment(0, 0, 20, [
        sourceFragment("paragraph-1", 2, 6, 0, 18)
      ]),
      createPageFragment(1, 6, 30, [
        sourceFragment("cell-1", 22, 26, 18, 36)
      ])
    ]);

    expect(index.findSourceFragmentsIntersectingRange({ from: 4, to: 5 })
      .map((match) => [match.page.pageIndex, match.sourceFragment.ownerId]))
      .toEqual([[0, "paragraph-1"]]);
    expect(index.findSourceFragmentsIntersectingRange({ from: 12, to: 14 })).toEqual([]);
    expect(index.findSourceFragmentsIntersectingRange({ from: 26, to: 26 })
      .map((match) => [match.page.pageIndex, match.sourceFragment.ownerId]))
      .toEqual([[1, "cell-1"]]);
    expect(index.findSourceFragmentsIntersectingRange({ from: 26, to: 4 })).toEqual([]);
  });

  it("preserves table-cell source provenance through range queries", () => {
    const tableCellFragment = tableCellSourceFragment({
      ownerId: "wordTable-1:cell-0-0",
      semanticOwnerId: "semantic:r0:c0:g1:2",
      originOwnerId: "explicit:r0:c0",
      explicitOwnerIds: ["explicit:r0:c0", "explicit:r1:c0"],
      originOwnerPos: 21,
      from: 21,
      to: 30,
      flowTop: 104,
      flowBottom: 132
    });
    const index = createQuirePaginationQueryIndex([
      createPageFragment(1, 10, 40, [tableCellFragment])
    ]);

    expect(index.findSourceFragmentsIntersectingRange({ from: 22, to: 22 }))
      .toEqual([{ page: index.pages[0], sourceFragment: tableCellFragment }]);
  });
});

/**
 * Creates a deterministic page fragment for query-index tests.
 *
 * @param pageIndex - Page index.
 * @param from - Fragment document start position.
 * @param to - Fragment document end position.
 * @returns Page fragment fixture.
 */
function createPageFragment(
  pageIndex: number,
  from: number,
  to: number,
  sourceFragments?: readonly QuireMeasuredContainerSourceFragment[]
): QuirePageFragment {
  return {
    pageIndex,
    range: { from, to },
    pageRect: { x: 0, y: pageIndex * 800, width: 600, height: 800 },
    bodyRect: { x: 40, y: 50 + pageIndex * 800, width: 500, height: 700 },
    rect: { x: 40, y: 50 + pageIndex * 800, width: 500, height: 120 },
    ...(sourceFragments === undefined ? {} : { sourceFragments }),
    endInfo: { openMarks: [], openNodes: [] }
  };
}

/**
 * Creates a deterministic text-line source fragment for query-index tests.
 *
 * @param ownerId - Source owner id.
 * @param from - Source range start.
 * @param to - Source range end.
 * @param flowTop - Source-flow top coordinate.
 * @param flowBottom - Source-flow bottom coordinate.
 * @returns Source fragment fixture.
 */
function sourceFragment(
  ownerId: string,
  from: number,
  to: number,
  flowTop: number,
  flowBottom: number
): QuireMeasuredContainerSourceFragment {
  return {
    kind: "textLine",
    ownerId,
    range: { from, to },
    flowTop,
    flowBottom
  };
}

/**
 * Creates a deterministic table-cell source fragment for query-index tests.
 *
 * @param options - Table-cell provenance and source-flow coordinates.
 * @returns Table-cell source fragment fixture.
 */
function tableCellSourceFragment(options: {
  /** Layout owner that emitted the cell line. */
  readonly ownerId: string;
  /** Stable semantic cell id. */
  readonly semanticOwnerId: string;
  /** Original explicit source cell id. */
  readonly originOwnerId: string;
  /** Explicit source cell ids represented by the semantic cell. */
  readonly explicitOwnerIds: readonly string[];
  /** Origin cell document position. */
  readonly originOwnerPos: number;
  /** Source range start. */
  readonly from: number;
  /** Source range end. */
  readonly to: number;
  /** Source-flow top coordinate. */
  readonly flowTop: number;
  /** Source-flow bottom coordinate. */
  readonly flowBottom: number;
}): QuireMeasuredContainerSourceFragment {
  return {
    kind: "tableCellLine",
    ownerId: options.ownerId,
    semanticOwnerId: options.semanticOwnerId,
    originOwnerId: options.originOwnerId,
    explicitOwnerIds: options.explicitOwnerIds,
    originOwnerPos: options.originOwnerPos,
    gridRect: {
      startRow: 0,
      startColumn: 0,
      rowSpan: 2,
      columnSpan: 1
    },
    range: { from: options.from, to: options.to },
    flowTop: options.flowTop,
    flowBottom: options.flowBottom
  };
}
