import { describe, expect, it } from "vitest";
import type {
  QuireMeasuredContainer,
  QuireMeasuredContainerItem
} from "./container";
import { createQuirePaginationCheckpointStore } from "./cache";
import type { QuirePageGeometry } from "./geometry";
import { driveQuireMeasuredContainerPages } from "./page-driver";
import { createQuirePaginationQueryIndex } from "./query-index";
import type { QuirePageFragment } from "./types";

/** Page geometry with a 25px body and 30px pages stacked without a gap. */
const pageGeometry: QuirePageGeometry = {
  pageRect: { x: 0, y: 0, width: 100, height: 30 },
  bodyRect: { x: 0, y: 0, width: 100, height: 25 }
};

/**
 * Summarizes source-flow metadata without depending on a View test fixture.
 *
 * @param pages - Renderer-neutral page fragments to summarize.
 * @returns Source-flow metadata retained by each page.
 */
function summarizePageSourceFlowBands(
  pages: readonly QuirePageFragment[]
): readonly Readonly<{
  pageIndex: number;
  sourceFlowY: number | undefined;
  sourceFlowHeight: number | undefined;
}>[] {
  return pages.map((page) => ({
    pageIndex: page.pageIndex,
    sourceFlowY: page.sourceFlowY,
    sourceFlowHeight: page.sourceFlowHeight
  }));
}

/**
 * Builds a measured container of indivisible 10px-tall items from ranges.
 *
 * @param ranges - Document ranges, one per item.
 * @returns Measured container with one leaf item per range.
 */
function container(ranges: readonly (readonly [number, number])[]): QuireMeasuredContainer {
  return {
    id: "body",
    range: { from: ranges[0]?.[0] ?? 0, to: ranges.at(-1)?.[1] ?? 0 },
    items: ranges.map(([from, to], index) => ({
      id: `item-${index}`,
      range: { from, to },
      flowTop: index * 10,
      flowBottom: index * 10 + 10,
      height: 10,
      canSplit: false
    }))
  };
}

describe("driveQuireMeasuredContainerPages", () => {
  it("keeps the continuation page open so the next block follows the split tail", () => {
    // Paragraph A = 3 lines (1-2,2-3,3-4), paragraph B = 2 lines (5-6,6-7).
    // A 25px body fits 2 lines; A spills after line 2.
    const { fragments: pages } = driveQuireMeasuredContainerPages({
      container: container([[1, 2], [2, 3], [3, 4], [5, 6], [6, 7]]),
      pageGeometry
    });

    expect(pages.map((page) => page.range)).toEqual([
      { from: 1, to: 3 }, // A line1 + A line2
      { from: 3, to: 6 }, // A line3 (tail) + B line1 — continuation page stays open
      { from: 6, to: 7 }  // B line2
    ]);
    // Page 2 carries both A's tail and B's start, not a lone trailing line.
    expect(pages[1]?.range).toEqual({ from: 3, to: 6 });
    expect(pages.map((page) => page.rect.height)).toEqual([20, 20, 10]);
    expect(summarizePageSourceFlowBands(pages)).toEqual([
      { pageIndex: 0, sourceFlowY: 0, sourceFlowHeight: 20 },
      { pageIndex: 1, sourceFlowY: 20, sourceFlowHeight: 20 },
      { pageIndex: 2, sourceFlowY: 40, sourceFlowHeight: 10 }
    ]);
    // Pages stack vertically by page index.
    expect(pages.map((page) => page.pageRect.y)).toEqual([0, 30, 60]);
  });

  it("reserves a capability-owned leading band and projects its explicit state", () => {
    const measured = container([[1, 2], [2, 3], [3, 4]]);
    const pageLeadingBand = {
      id: "fixture-leading-band",
      height: 5,
      continuationState: {
        fixtureBand: { ownerId: "fixture-owner" }
      }
    };
    const { fragments: pages } = driveQuireMeasuredContainerPages({
      container: {
        ...measured,
        items: measured.items.map((item, index) => index === 0
          ? item
          : { ...item, pageLeadingBand })
      },
      pageGeometry
    });

    expect(pages.map((page) => page.rect.height)).toEqual([20, 15]);
    expect(pages[1]?.endInfo.continuationState).toEqual({
      fixtureBand: { ownerId: "fixture-owner" }
    });
  });

  it("place-and-overflows an indivisible item taller than the page body", () => {
    const tall: QuireMeasuredContainer = {
      id: "body",
      range: { from: 1, to: 2 },
      items: [{
        id: "tall",
        range: { from: 1, to: 2 },
        flowTop: 0,
        flowBottom: 40,
        height: 40,
        canSplit: false
      }]
    };

    const { fragments: pages } = driveQuireMeasuredContainerPages({ container: tall, pageGeometry });

    expect(pages).toHaveLength(1);
    expect(pages[0]?.range).toEqual({ from: 1, to: 2 });
    expect(pages[0]?.rect.height).toBe(40);
    expect(summarizePageSourceFlowBands(pages)).toEqual([
      { pageIndex: 0, sourceFlowY: 0, sourceFlowHeight: 40 }
    ]);
  });

  it("stores a completed page-drive pass ending in place-and-overflow", () => {
    const cache = createQuirePaginationCheckpointStore();
    const tall: QuireMeasuredContainer = {
      id: "body",
      range: { from: 1, to: 2 },
      items: [{
        id: "tall",
        range: { from: 1, to: 2 },
        flowTop: 0,
        flowBottom: 40,
        height: 40,
        canSplit: false
      }]
    };

    driveQuireMeasuredContainerPages({
      container: tall,
      pageGeometry,
      paginationCheckpointStore: cache,
      paginationGeometryKey: "fixture"
    });

    expect(cache.snapshot()).toEqual({
      prefixHits: 0,
      prefixMisses: 0,
      prefixPagesReused: 0,
      convergenceHits: 0,
      convergenceMisses: 0,
      suffixPagesReused: 0,
      pagesRecomputed: 1,
      stores: 1
    });
  });

  it("returns no pages for an empty container", () => {
    const { fragments: pages } = driveQuireMeasuredContainerPages({
      container: { id: "body", range: { from: 0, to: 0 }, items: [] },
      pageGeometry
    });

    expect(pages).toEqual([]);
  });

  it("carries accepted source fragments onto page fragments", () => {
    const { fragments: pages } = driveQuireMeasuredContainerPages({
      container: {
        id: "body",
        range: { from: 1, to: 4 },
        items: [
          {
            id: "line-1",
            range: { from: 1, to: 2 },
            flowTop: 0,
            flowBottom: 10,
            height: 10,
            canSplit: false,
            sourceFragments: [{
              kind: "textLine",
              ownerId: "paragraph-1",
              range: { from: 1, to: 2 },
              flowTop: 0,
              flowBottom: 10
            }]
          },
          {
            id: "line-2",
            range: { from: 2, to: 4 },
            flowTop: 10,
            flowBottom: 20,
            height: 10,
            canSplit: false,
            sourceFragments: [{
              kind: "tableCellLine",
              ownerId: "cell-1",
              semanticOwnerId: "semantic-cell-1",
              originOwnerId: "origin-cell-1",
              explicitOwnerIds: ["origin-cell-1"],
              originOwnerPos: 2,
              gridRect: {
                startRow: 0,
                startColumn: 0,
                rowSpan: 1,
                columnSpan: 1
              },
              range: { from: 2, to: 4 },
              flowTop: 10,
              flowBottom: 20
            }]
          }
        ]
      },
      pageGeometry
    });

    expect(pages[0]?.sourceFragments).toEqual([
      {
        kind: "textLine",
        ownerId: "paragraph-1",
        range: { from: 1, to: 2 },
        flowTop: 0,
        flowBottom: 10
      },
      {
        kind: "tableCellLine",
        ownerId: "cell-1",
        semanticOwnerId: "semantic-cell-1",
        originOwnerId: "origin-cell-1",
        explicitOwnerIds: ["origin-cell-1"],
        originOwnerPos: 2,
        gridRect: {
          startRow: 0,
          startColumn: 0,
          rowSpan: 1,
          columnSpan: 1
        },
        range: { from: 2, to: 4 },
        flowTop: 10,
        flowBottom: 20
      }
    ]);
    const index = createQuirePaginationQueryIndex(pages);

    expect(index.findSourceFragmentsIntersectingRange({ from: 3, to: 3 })
      .map((match) => match.sourceFragment)).toEqual([
        {
          kind: "tableCellLine",
          ownerId: "cell-1",
          semanticOwnerId: "semantic-cell-1",
          originOwnerId: "origin-cell-1",
          explicitOwnerIds: ["origin-cell-1"],
          originOwnerPos: 2,
          gridRect: {
            startRow: 0,
            startColumn: 0,
            rowSpan: 1,
            columnSpan: 1
          },
          range: { from: 2, to: 4 },
          flowTop: 10,
          flowBottom: 20
        }
      ]);
  });

  it("reuses source context collected by the pagination scan", () => {
    let sourceFragmentReads = 0;
    const sourceFragments: NonNullable<QuireMeasuredContainerItem["sourceFragments"]> = [{
      kind: "textLine",
      ownerId: "paragraph-1",
      range: { from: 1, to: 2 },
      flowTop: 0,
      flowBottom: 10
    }];
    const item: QuireMeasuredContainerItem = {
      id: "line-1",
      range: { from: 1, to: 2 },
      flowTop: 0,
      flowBottom: 10,
      height: 10,
      canSplit: false
    };

    Object.defineProperty(item, "sourceFragments", {
      enumerable: true,
      get() {
        sourceFragmentReads += 1;
        return sourceFragments;
      }
    });

    const { fragments: pages } = driveQuireMeasuredContainerPages({
      container: {
        id: "body",
        range: { from: 1, to: 2 },
        items: [item]
      },
      pageGeometry
    });

    expect(sourceFragmentReads).toBe(1);
    expect(pages[0]?.sourceFragments).toEqual(sourceFragments);
  });

  it("skips source context collection on pages outside the active projection window", () => {
    let sourceFragmentReads = 0;
    const sourceFragments: NonNullable<QuireMeasuredContainerItem["sourceFragments"]> = [{
      kind: "textLine",
      ownerId: "paragraph-1",
      range: { from: 1, to: 2 },
      flowTop: 0,
      flowBottom: 10
    }];
    const item: QuireMeasuredContainerItem = {
      id: "line-1",
      range: { from: 1, to: 2 },
      flowTop: 0,
      flowBottom: 10,
      height: 10,
      canSplit: false
    };

    Object.defineProperty(item, "sourceFragments", {
      enumerable: true,
      get() {
        sourceFragmentReads += 1;
        return sourceFragments;
      }
    });

    const { fragments: pages } = driveQuireMeasuredContainerPages({
      container: {
        id: "body",
        range: { from: 1, to: 2 },
        items: [item]
      },
      pageGeometry,
      collectSourceContextForPage: () => false
    });

    expect(sourceFragmentReads).toBe(0);
    expect(pages[0]).toMatchObject({
      pageIndex: 0,
      range: { from: 1, to: 2 },
      rect: { x: 0, y: 0, width: 100, height: 10 }
    });
    expect(pages[0]?.sourceFlowY).toBeUndefined();
    expect(pages[0]?.sourceFragments).toBeUndefined();
  });

  it("pauses after a page window and resumes to reproduce the full pass", () => {
    const body = container([[1, 2], [2, 3], [3, 4], [5, 6], [6, 7]]);
    const full = driveQuireMeasuredContainerPages({ container: body, pageGeometry });
    expect(full.continuation).toBeNull();

    // Stop after the first page; the rest must come back as a continuation.
    const first = driveQuireMeasuredContainerPages({
      container: body,
      pageGeometry,
      stopAfterPageIndex: 0
    });
    expect(first.fragments.map((page) => page.range)).toEqual([{ from: 1, to: 3 }]);
    expect(first.continuation).not.toBeNull();

    const rest = driveQuireMeasuredContainerPages({
      container: body,
      pageGeometry,
      resume: first.continuation!
    });
    expect(rest.continuation).toBeNull();

    // First window + resumed remainder must byte-equal the single full pass.
    const resumed = [...first.fragments, ...rest.fragments];
    expect(resumed.map((page) => page.range)).toEqual(full.fragments.map((page) => page.range));
    expect(resumed.map((page) => page.rect.height)).toEqual(
      full.fragments.map((page) => page.rect.height)
    );
    expect(resumed.map((page) => page.pageRect.y)).toEqual(
      full.fragments.map((page) => page.pageRect.y)
    );
  });

  it("reuses cached prefix pages before the dirty range", () => {
    const cache = createQuirePaginationCheckpointStore();
    let sourceFragmentReads = 0;
    const body = container([[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]);
    for (const [index, item] of body.items.entries()) {
      const sourceFragments: NonNullable<QuireMeasuredContainerItem["sourceFragments"]> = [{
        kind: "textLine",
        ownerId: `line-${index}`,
        range: item.range,
        flowTop: item.flowTop ?? index * 10,
        flowBottom: item.flowBottom ?? index * 10 + 10
      }];

      Object.defineProperty(item, "sourceFragments", {
        enumerable: true,
        get() {
          sourceFragmentReads += 1;
          return sourceFragments;
        }
      });
    }

    const first = driveQuireMeasuredContainerPages({
      container: body,
      pageGeometry,
      paginationCheckpointStore: cache,
      paginationGeometryKey: "fixture"
    });

    expect(first.fragments.map((page) => page.range)).toEqual([
      { from: 1, to: 3 },
      { from: 3, to: 5 },
      { from: 5, to: 7 }
    ]);
    expect(sourceFragmentReads).toBe(6);
    expect(cache.snapshot()).toEqual({
      prefixHits: 0,
      prefixMisses: 0,
      prefixPagesReused: 0,
      convergenceHits: 0,
      convergenceMisses: 0,
      suffixPagesReused: 0,
      pagesRecomputed: 3,
      stores: 1
    });

    sourceFragmentReads = 0;
    const second = driveQuireMeasuredContainerPages({
      container: body,
      pageGeometry,
      paginationCheckpointStore: cache,
      paginationGeometryKey: "fixture",
      dirtyRange: { from: 5, to: 6 }
    });

    expect(second.fragments.map((page) => page.range)).toEqual(
      first.fragments.map((page) => page.range)
    );
    expect(sourceFragmentReads).toBe(2);
    expect(cache.snapshot()).toEqual({
      prefixHits: 1,
      prefixMisses: 0,
      prefixPagesReused: 2,
      convergenceHits: 0,
      convergenceMisses: 1,
      suffixPagesReused: 0,
      pagesRecomputed: 4,
      stores: 2
    });
  });

  it("stops after a converged checkpoint and reuses the retained suffix", () => {
    const store = createQuirePaginationCheckpointStore();
    let sourceFragmentReads = 0;
    const body = container([[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]);
    for (const [index, item] of body.items.entries()) {
      const sourceFragments: NonNullable<QuireMeasuredContainerItem["sourceFragments"]> = [{
        kind: "textLine",
        ownerId: `line-${index}`,
        range: item.range,
        flowTop: item.flowTop ?? index * 10,
        flowBottom: item.flowBottom ?? index * 10 + 10
      }];
      Object.defineProperty(item, "sourceFragments", {
        enumerable: true,
        get() {
          sourceFragmentReads += 1;
          return sourceFragments;
        }
      });
    }

    const first = driveQuireMeasuredContainerPages({
      container: body,
      pageGeometry,
      paginationCheckpointStore: store,
      paginationGeometryKey: "fixture"
    });
    expect(sourceFragmentReads).toBe(6);

    sourceFragmentReads = 0;
    const second = driveQuireMeasuredContainerPages({
      container: body,
      pageGeometry,
      paginationCheckpointStore: store,
      paginationGeometryKey: "fixture",
      dirtyRange: { from: 3, to: 4 }
    });
    expect(second.fragments).toEqual(first.fragments);
    expect(sourceFragmentReads).toBe(2);
    expect(store.snapshot()).toEqual({
      prefixHits: 1,
      prefixMisses: 0,
      prefixPagesReused: 1,
      convergenceHits: 1,
      convergenceMisses: 0,
      suffixPagesReused: 1,
      pagesRecomputed: 4,
      stores: 2
    });
  });

  it("translates a converged suffix by the proven document-range delta", () => {
    const store = createQuirePaginationCheckpointStore();
    const initial = container([[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]);
    const first = driveQuireMeasuredContainerPages({
      container: initial,
      pageGeometry,
      paginationCheckpointStore: store,
      paginationGeometryKey: "fixture"
    });
    const shifted: QuireMeasuredContainer = {
      ...initial,
      range: { from: 1, to: 8 },
      items: initial.items.map((item, index) => index < 2
        ? item
        : {
            ...item,
            range: { from: item.range.from + 1, to: item.range.to + 1 }
          })
    };

    const second = driveQuireMeasuredContainerPages({
      container: shifted,
      pageGeometry,
      paginationCheckpointStore: store,
      paginationGeometryKey: "fixture",
      dirtyRange: { from: 3, to: 4 }
    });
    const full = driveQuireMeasuredContainerPages({
      container: shifted,
      pageGeometry,
      paginationGeometryKey: "fixture"
    });

    expect(first.fragments.map((page) => page.range)).toEqual([
      { from: 1, to: 3 },
      { from: 3, to: 5 },
      { from: 5, to: 7 }
    ]);
    expect(second.fragments.map((page) => page.range)).toEqual([
      { from: 1, to: 3 },
      { from: 4, to: 6 },
      { from: 6, to: 8 }
    ]);
    expect(second.fragments).toEqual(full.fragments);
    expect(store.snapshot()).toMatchObject({
      prefixPagesReused: 1,
      convergenceHits: 1,
      suffixPagesReused: 1
    });
  });

  it("reuses the suffix after a table-row height delta converges", () => {
    const store = createQuirePaginationCheckpointStore();
    const initial = container([[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]);
    driveQuireMeasuredContainerPages({
      container: initial,
      pageGeometry,
      paginationCheckpointStore: store,
      paginationGeometryKey: "fixture"
    });
    const changed: QuireMeasuredContainer = {
      ...initial,
      items: initial.items.map((item, index) => {
        if (index < 2) {
          return item;
        }
        if (index === 2) {
          return {
            ...item,
            id: "table-row-2",
            flowBottom: 35,
            height: 15
          };
        }
        return {
          ...item,
          flowTop: (item.flowTop ?? 0) + 5,
          flowBottom: (item.flowBottom ?? 0) + 5
        };
      })
    };

    const result = driveQuireMeasuredContainerPages({
      container: changed,
      pageGeometry,
      paginationCheckpointStore: store,
      paginationGeometryKey: "fixture",
      dirtyRange: { from: 3, to: 4 }
    });
    const full = driveQuireMeasuredContainerPages({
      container: changed,
      pageGeometry,
      paginationGeometryKey: "fixture"
    });

    expect(result.fragments.map((page) => page.rect.height)).toEqual([20, 25, 20]);
    expect(result.fragments).toEqual(full.fragments);
    expect(store.snapshot()).toMatchObject({
      prefixPagesReused: 1,
      convergenceHits: 1,
      suffixPagesReused: 1
    });
  });

  it("propagates a line-count insertion near the top when no checkpoint converges", () => {
    const store = createQuirePaginationCheckpointStore();
    const initial = container([[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]);
    driveQuireMeasuredContainerPages({
      container: initial,
      pageGeometry,
      paginationCheckpointStore: store,
      paginationGeometryKey: "fixture"
    });
    const insertedItem: QuireMeasuredContainerItem = {
      id: "inserted-line",
      range: { from: 3, to: 4 },
      flowTop: 20,
      flowBottom: 30,
      height: 10,
      canSplit: false
    };
    const changed: QuireMeasuredContainer = {
      ...initial,
      range: { from: 1, to: 8 },
      items: [
        ...initial.items.slice(0, 2),
        insertedItem,
        ...initial.items.slice(2).map((item) => ({
          ...item,
          range: { from: item.range.from + 1, to: item.range.to + 1 },
          flowTop: (item.flowTop ?? 0) + 10,
          flowBottom: (item.flowBottom ?? 0) + 10
        }))
      ]
    };

    const result = driveQuireMeasuredContainerPages({
      container: changed,
      pageGeometry,
      paginationCheckpointStore: store,
      paginationGeometryKey: "fixture",
      dirtyRange: { from: 3, to: 4 }
    });
    const full = driveQuireMeasuredContainerPages({
      container: changed,
      pageGeometry,
      paginationGeometryKey: "fixture"
    });

    expect(result.fragments.map((page) => page.range)).toEqual([
      { from: 1, to: 3 },
      { from: 3, to: 5 },
      { from: 5, to: 7 },
      { from: 7, to: 8 }
    ]);
    expect(result.fragments).toEqual(full.fragments);
    expect(store.snapshot()).toMatchObject({
      prefixPagesReused: 1,
      convergenceHits: 0,
      convergenceMisses: 1,
      suffixPagesReused: 0
    });
  });

  it("keeps widow and orphan policy inside the checkpoint geometry key", () => {
    const store = createQuirePaginationCheckpointStore();
    const base = container([[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]);
    const grouped: QuireMeasuredContainer = {
      ...base,
      items: base.items.map((item) => ({ ...item, group: "paragraph" }))
    };
    const first = driveQuireMeasuredContainerPages({
      container: grouped,
      pageGeometry,
      widows: 2,
      orphans: 2,
      paginationCheckpointStore: store,
      paginationGeometryKey: "fixture|widows:2|orphans:2"
    });
    const second = driveQuireMeasuredContainerPages({
      container: grouped,
      pageGeometry,
      widows: 2,
      orphans: 2,
      paginationCheckpointStore: store,
      paginationGeometryKey: "fixture|widows:2|orphans:2",
      dirtyRange: { from: 3, to: 4 }
    });

    expect(second.fragments).toEqual(first.fragments);
    expect(store.snapshot()).toMatchObject({
      convergenceHits: 1,
      suffixPagesReused: 1
    });
  });

  it("rejects retained checkpoints when page geometry changes", () => {
    const store = createQuirePaginationCheckpointStore();
    const body = container([[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]);
    driveQuireMeasuredContainerPages({
      container: body,
      pageGeometry,
      paginationCheckpointStore: store,
      paginationGeometryKey: "geometry-a"
    });

    driveQuireMeasuredContainerPages({
      container: body,
      pageGeometry,
      paginationCheckpointStore: store,
      paginationGeometryKey: "geometry-b",
      dirtyRange: { from: 3, to: 4 }
    });

    expect(store.snapshot()).toMatchObject({
      prefixHits: 0,
      prefixMisses: 1,
      convergenceHits: 0,
      convergenceMisses: 0,
      suffixPagesReused: 0,
      stores: 2
    });
  });

  it("does not converge across changed table continuation state", () => {
    const store = createQuirePaginationCheckpointStore();
    const base = container([[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]]);
    const withContinuation = (row: number): QuireMeasuredContainer => ({
      ...base,
      items: base.items.map((item, index) => index === 1
        ? {
            ...item,
            endInfo: {
              openMarks: [],
              openNodes: [],
              continuationState: { table: { row } }
            }
          }
        : item)
    });
    driveQuireMeasuredContainerPages({
      container: withContinuation(1),
      pageGeometry,
      paginationCheckpointStore: store,
      paginationGeometryKey: "fixture"
    });

    driveQuireMeasuredContainerPages({
      container: withContinuation(2),
      pageGeometry,
      paginationCheckpointStore: store,
      paginationGeometryKey: "fixture",
      dirtyRange: { from: 1, to: 3 }
    });

    expect(store.snapshot()).toMatchObject({
      convergenceHits: 0,
      convergenceMisses: 1,
      suffixPagesReused: 0
    });
  });
});
