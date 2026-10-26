import { describe, expect, it } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireLayoutBox, QuireLayoutContainer } from "../types";
import type {
  QuireMeasuredContainer,
  QuireMeasuredContainerItem
} from "@quirekit/layout/pagination";
import type { QuireBlockPaginationPolicy } from "@quirekit/layout/block-flow";
import {
  buildQuireBodyMeasuredContainer,
  type QuireMeasuredSourceCacheAdapter
} from "./measured-source";
import { retainQuireTestTableCellSubLayoutIdentity } from "../../../../test-support/layout/table-cell-sub-layout";

/**
 * Builds a minimal text fragment on a given visual line.
 *
 * @param from - Range start.
 * @param to - Range end.
 * @param y - Line-box top in flow space.
 * @returns Text fragment sufficient for line grouping.
 */
function fragment(from: number, to: number, y: number): QuireTextFragment {
  return {
    id: `f-${from}`,
    text: "x",
    range: { from, to },
    rect: { x: 0, y, width: 10, height: 10 },
    font: "16px test",
    lineHeight: 10,
    baseline: y + 8,
    caretStops: []
  } as unknown as QuireTextFragment;
}

/**
 * Builds a layout box with optional text fragments.
 *
 * @param id - Box id.
 * @param from - Range start.
 * @param to - Range end.
 * @param height - Box rect height.
 * @param fragments - Optional owned text fragments.
 * @param pagination - Optional paragraph pagination policy.
 * @returns Layout box.
 */
function box(
  id: string,
  from: number,
  to: number,
  y: number,
  height: number,
  fragments?: readonly QuireTextFragment[],
  pagination?: QuireBlockPaginationPolicy
): QuireLayoutBox {
  return {
    id,
    range: { from, to },
    rect: { x: 0, y, width: 100, height },
    ...(fragments === undefined ? {} : { textFragments: fragments }),
    ...(pagination === undefined ? {} : { pagination })
  };
}

/**
 * Retains provider-owned identity on a table-cell source box fixture.
 *
 * @param sourceBox - Source cell box used by a measured-source fixture.
 * @returns Source cell box with retained test sub-layout identity.
 */
function createTableCellSourceBox<TSourceBox extends QuireLayoutBox>(
  sourceBox: TSourceBox
): TSourceBox {
  const cell = {
    id: sourceBox.id,
    semanticCellId: `semantic:${sourceBox.id}`,
    originExplicitCellId: `explicit:${sourceBox.id}`,
    explicitCellIds: [`explicit:${sourceBox.id}`],
    originCellPos: sourceBox.range.from,
    range: sourceBox.range,
    rect: sourceBox.rect,
    contentRect: sourceBox.rect,
    gridRect: { startRow: 0, startColumn: 0, rowSpan: 1, columnSpan: 1 },
    shading: null,
    backgroundColor: null,
    borders: null,
    cellMargins: null,
    preferredWidth: null,
    contentChildren: []
  } as const;

  return retainQuireTestTableCellSubLayoutIdentity(sourceBox, cell) as TSourceBox;
}

/**
 * Drops provenance when a test is concerned only with pagination item geometry.
 *
 * @param items - Measured items to normalize.
 * @returns Measured items without source-fragment provenance.
 */
function withoutSourceFragments(
  items: readonly QuireMeasuredContainerItem[]
): readonly Omit<QuireMeasuredContainerItem, "sourceFragments">[] {
  return items.map(({ sourceFragments: _sourceFragments, ...item }) => item);
}

describe("buildQuireBodyMeasuredContainer", () => {
  it("preserves false and zero policies while omitting undefined item options", () => {
    const measured = buildQuireBodyMeasuredContainer([
      box("plain", 0, 3, 0, 10, [fragment(1, 2, 0)]),
      box("explicit", 3, 6, 10, 10, [fragment(4, 5, 10)], {
        keepTogether: false, keepWithNext: false, widows: 0, orphans: 0
      })
    ]);
    expect(measured.items[0]).not.toHaveProperty("group");
    expect(measured.items[0]).not.toHaveProperty("keepTogether");
    expect(measured.items[1]).toMatchObject({
      keepTogether: false, keepWithNext: false, groupWidows: 0, groupOrphans: 0
    });
    expect(measured.items[1]).not.toHaveProperty("breakBefore");
  });

  it("keeps text-line identities stable across document-range translation", () => {
    const initial = buildQuireBodyMeasuredContainer([
      box("p1", 0, 5, 0, 20, [
        fragment(1, 2, 0),
        fragment(2, 4, 10)
      ])
    ]);
    const shifted = buildQuireBodyMeasuredContainer([
      box("p1", 10, 15, 0, 20, [
        fragment(11, 12, 0),
        fragment(12, 14, 10)
      ])
    ]);

    expect(initial.items.map((item) => item.id)).toEqual([
      "p1:line:0",
      "p1:line:1"
    ]);
    expect(shifted.items.map((item) => item.id)).toEqual(
      initial.items.map((item) => item.id)
    );
  });

  it("counts a list marker and its first body line as one measured line", () => {
    // The marker shares the body baseline with a taller glyph box, so its top sits above the line box.
    const marker = { ...fragment(1, 1, -2), lineHeight: 12 } as QuireTextFragment;
    const measured = buildQuireBodyMeasuredContainer([
      box("item", 0, 6, -2, 22, [marker, fragment(1, 3, 0), fragment(3, 5, 10)])
    ]);

    expect(measured.items.map((item) => [item.flowTop, item.flowBottom])).toEqual([[-2, 10], [10, 20]]);
  });
  it("expands a text block into line items and carries the next block's leading gap", () => {
    // Paragraph lines at y 0/10/20 (bottoms 10/20/30); the rule sits at y 38, an
    // 8px block gap that must survive as gapBefore. Within-block lines are
    // contiguous, so they carry no gap.
    // Block range {0,5} exceeds its text lines {1,4}: the first line extends down
    // to 0 and the last line up to 5 so the block's node boundaries stay covered.
    const paragraph = box("p1", 0, 5, 0, 30, [
      fragment(1, 2, 0),
      fragment(2, 3, 10),
      fragment(3, 4, 20)
    ]);
    const rule = box("hr", 5, 6, 38, 8);

    const result = buildQuireBodyMeasuredContainer([paragraph, rule]);

    expect(result.range).toEqual({ from: 0, to: 6 });
    expect(withoutSourceFragments(result.items)).toEqual([
      {
        id: "p1:line:0",
        range: { from: 0, to: 2 },
        flowTop: 0,
        flowBottom: 10,
        height: 10,
        canSplit: false,
        group: "p1"
      },
      {
        id: "p1:line:1",
        range: { from: 2, to: 3 },
        flowTop: 10,
        flowBottom: 20,
        height: 10,
        canSplit: false,
        group: "p1"
      },
      {
        id: "p1:line:2",
        range: { from: 3, to: 5 },
        flowTop: 20,
        flowBottom: 30,
        height: 10,
        canSplit: false,
        group: "p1"
      },
      {
        id: "hr",
        range: { from: 5, to: 6 },
        flowTop: 38,
        flowBottom: 46,
        height: 8,
        canSplit: false,
        gapBefore: 8
      }
    ]);
  });

  it("projects one paragraph pagination policy onto every measured line", () => {
    const paragraph = box(
      "p1",
      0,
      5,
      0,
      30,
      [
        fragment(1, 2, 0),
        fragment(2, 3, 10),
        fragment(3, 4, 20)
      ],
      {
        breakBefore: "page",
        keepTogether: true,
        keepWithNext: true,
        widows: 2,
        orphans: 2
      }
    );

    expect(withoutSourceFragments(
      buildQuireBodyMeasuredContainer([paragraph]).items
    )).toMatchObject([
      {
        id: "p1:line:0",
        breakBefore: "page",
        keepTogether: true,
        keepWithNext: true,
        groupWidows: 2,
        groupOrphans: 2
      },
      {
        id: "p1:line:1",
        keepTogether: true,
        keepWithNext: true,
        groupWidows: 2,
        groupOrphans: 2
      },
      {
        id: "p1:line:2",
        keepTogether: true,
        keepWithNext: true,
        groupWidows: 2,
        groupOrphans: 2
      }
    ]);
  });

  it("expands a renderer-neutral recursive container into child flow items", () => {
    const container: QuireLayoutContainer = {
      id: "quote",
      range: { from: 0, to: 12 },
      rect: { x: 0, y: 0, width: 100, height: 28 },
      children: [
        box("quote-p1", 1, 6, 0, 10, [fragment(2, 5, 0)]),
        box("quote-p2", 6, 11, 18, 10, [fragment(7, 10, 18)])
      ]
    };

    const result = buildQuireBodyMeasuredContainer([container]);

    expect(withoutSourceFragments(result.items)).toEqual([
      {
        id: "quote-p1:line:0",
        range: { from: 0, to: 6 },
        flowTop: 0,
        flowBottom: 10,
        height: 10,
        canSplit: false
      },
      {
        id: "quote-p2:line:0",
        range: { from: 6, to: 12 },
        flowTop: 18,
        flowBottom: 28,
        height: 10,
        canSplit: false,
        gapBefore: 8
      }
    ]);
  });

  it("returns an empty container for no boxes", () => {
    expect(buildQuireBodyMeasuredContainer([])).toEqual({
      id: "body",
      range: { from: 0, to: 0 },
      items: []
    });
  });

  it("reuses adjusted external-gap items for stable cached boxes", () => {
    const cache = new TestMeasuredSourceCache();
    const paragraph = box("p1", 0, 5, 0, 10, [fragment(1, 5, 0)]);
    const rule = box("hr", 5, 6, 18, 8);

    const first = buildQuireBodyMeasuredContainer([paragraph, rule], cache);
    const second = buildQuireBodyMeasuredContainer([paragraph, rule], cache);

    expect(second.items[1]).toBe(first.items[1]);
    expect(second.items[1]?.gapBefore).toBe(8);
  });

  it("reuses the measured body prefix before the dirty range", () => {
    const cache = new TestMeasuredSourceCache();
    const prefixA = box("p0", 0, 4, 0, 8);
    const prefixB = box("p1", 4, 8, 16, 8);
    const active = box("p2", 8, 12, 32, 8);
    const suffix = box("p3", 12, 16, 48, 8);

    const first = buildQuireBodyMeasuredContainer(
      [prefixA, prefixB, active, suffix],
      cache
    );
    cache.resetGetCalls();

    const changedActive = box("p2", 8, 13, 32, 10);
    const expected = buildQuireBodyMeasuredContainer([
      prefixA,
      prefixB,
      changedActive,
      suffix
    ]);
    const second = buildQuireBodyMeasuredContainer(
      [prefixA, prefixB, changedActive, suffix],
      cache,
      { from: 10, to: 11 }
    );

    expect(second).toEqual(expected);
    expect(second.items[0]).toBe(first.items[0]);
    expect(second.items[1]).toBe(first.items[1]);
    expect(cache.getCalls).toEqual(["p2", "p3"]);
  });

  it("expands table rows into measured items", () => {
    const table = {
      id: "wordTable-0:layout",
      range: { from: 10, to: 40 },
      rect: { x: 0, y: 12, width: 100, height: 56 },
      table: {
        tableId: "wordTable-0",
        fragmentId: "wordTable-0",
        geometryId: "wordTable-0",
        tableRange: { from: 10, to: 40 },
        style: {
          backgroundColor: null,
          borderColor: "#cbd5e1",
          borderWidth: 1
        },
        borders: null,
        rect: { x: 0, y: 12, width: 100, height: 56 },
        tracks: [],
        rows: [
          {
            id: "wordTable-0:row-0",
            sourceRowId: "row:r0",
            rowIndex: 0,
            isHeader: false,
            cantSplit: false,
            range: { from: 11, to: 20 },
            rect: { x: 0, y: 12, width: 100, height: 28 }
          },
          {
            id: "wordTable-0:row-1",
            sourceRowId: "row:r1",
            rowIndex: 1,
            isHeader: false,
            cantSplit: false,
            range: { from: 21, to: 30 },
            rect: { x: 0, y: 40, width: 100, height: 28 }
          }
        ],
        cells: [],
        hitTargets: []
      }
    } satisfies QuireLayoutBox;

    expect(withoutSourceFragments(buildQuireBodyMeasuredContainer([table]).items)).toEqual([
      {
        id: "wordTable-0:layout:row:0",
        range: { from: 11, to: 20 },
        flowTop: 12,
        flowBottom: 40,
        height: 28,
        canSplit: false
      },
      {
        id: "wordTable-0:layout:row:1",
        range: { from: 21, to: 30 },
        flowTop: 40,
        flowBottom: 68,
        height: 28,
        canSplit: false
      }
    ]);
  });

  it("keeps a floating table as one zero-height logical anchor item", () => {
    const table = {
      id: "wordTable-floating:layout",
      range: { from: 10, to: 40 },
      rect: { x: 0, y: 12, width: 300, height: 0 },
      table: {
        tableId: "wordTable-floating",
        fragmentId: "wordTable-floating",
        geometryId: "wordTable-floating",
        tableRange: { from: 10, to: 40 },
        style: {
          backgroundColor: null,
          borderColor: "#cbd5e1",
          borderWidth: 1
        },
        borders: null,
        floating: {
          horizontal: {
            reference: "page",
            offset: 40,
            alignment: null
          },
          vertical: {
            reference: "text",
            offset: 20,
            alignment: null
          },
          clearances: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          },
          wrapMode: null,
          allowOverlap: false
        },
        rect: { x: 0, y: 12, width: 100, height: 56 },
        tracks: [],
        rows: [
          {
            id: "wordTable-floating:row-0",
            sourceRowId: "row:r0",
            rowIndex: 0,
            isHeader: false,
            cantSplit: false,
            range: { from: 11, to: 39 },
            rect: { x: 0, y: 12, width: 100, height: 56 }
          }
        ],
        cells: [],
        hitTargets: []
      }
    } satisfies QuireLayoutBox;

    expect(buildQuireBodyMeasuredContainer([table]).items).toEqual([
      {
        id: "wordTable-floating:layout",
        range: { from: 10, to: 40 },
        flowTop: 12,
        flowBottom: 12,
        height: 0,
        canSplit: false
      }
    ]);
  });

  it("uses a floating table provider footprint as one indivisible flow item", () => {
    const table = {
      id: "wordTable-floating-block:layout",
      range: { from: 10, to: 40 },
      rect: { x: 0, y: 12, width: 300, height: 76 },
      table: {
        tableId: "wordTable-floating-block",
        fragmentId: "wordTable-floating-block",
        geometryId: "wordTable-floating-block",
        tableRange: { from: 10, to: 40 },
        style: {
          backgroundColor: null,
          borderColor: "#cbd5e1",
          borderWidth: 1
        },
        borders: null,
        floating: {
          horizontal: {
            reference: "page",
            offset: 40,
            alignment: null
          },
          vertical: {
            reference: "text",
            offset: 20,
            alignment: null
          },
          clearances: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          },
          wrapMode: null,
          allowOverlap: false
        },
        rect: { x: 0, y: 12, width: 300, height: 56 },
        tracks: [],
        rows: [],
        cells: [],
        hitTargets: []
      }
    } satisfies QuireLayoutBox;

    expect(buildQuireBodyMeasuredContainer([table]).items).toEqual([
      {
        id: "wordTable-floating-block:layout",
        range: { from: 10, to: 40 },
        flowTop: 12,
        flowBottom: 88,
        height: 76,
        canSplit: false
      }
    ]);
  });

  it("keeps table row frame padding on the first and last measured line items", () => {
    const cellContent = createTableCellSourceBox({
      id: "wordTable-0:cell-0-0",
      range: { from: 11, to: 70 },
      rect: { x: 0, y: 10, width: 100, height: 60 },
      textFragments: [
        fragment(12, 16, 20),
        fragment(42, 46, 40)
      ]
    });
    const table = {
      id: "wordTable-0:layout",
      range: { from: 10, to: 80 },
      rect: { x: 0, y: 10, width: 100, height: 60 },
      table: {
        tableId: "wordTable-0",
        fragmentId: "wordTable-0",
        geometryId: "wordTable-0",
        tableRange: { from: 10, to: 80 },
        style: {
          backgroundColor: null,
          borderColor: "#cbd5e1",
          borderWidth: 1
        },
        borders: null,
        rect: { x: 0, y: 10, width: 100, height: 60 },
        tracks: [],
        rows: [
          {
            id: "wordTable-0:row-0",
            sourceRowId: "row:r0",
            rowIndex: 0,
            isHeader: false,
            cantSplit: false,
            range: { from: 11, to: 70 },
            rect: { x: 0, y: 10, width: 100, height: 60 }
          }
        ],
        cells: [
          {
            id: "wordTable-0:cell-0-0",
            semanticCellId: "semantic:r0:c0:g1:1",
            originExplicitCellId: "cell:r0:c0:g1:1",
            explicitCellIds: ["cell:r0:c0:g1:1"],
            originCellPos: 11,
            range: { from: 11, to: 70 },
            shading: null,
            backgroundColor: null,
            borders: null,
            cellMargins: null,
            preferredWidth: null,
            gridRect: { startRow: 0, startColumn: 0, rowSpan: 1, columnSpan: 1 },
            rect: { x: 0, y: 10, width: 100, height: 60 },
            contentRect: { x: 0, y: 10, width: 100, height: 60 },
            contentChildren: []
          }
        ],
        hitTargets: []
      },
      children: [cellContent]
    } satisfies QuireLayoutContainer;

    expect(withoutSourceFragments(buildQuireBodyMeasuredContainer([table]).items)).toEqual([
      {
        id: "wordTable-0:layout:row:0:line:0",
        range: { from: 11, to: 16 },
        flowTop: 10,
        flowBottom: 30,
        height: 20,
        canSplit: false,
        group: "wordTable-0:layout:row:0"
      },
      {
        id: "wordTable-0:layout:row:0:line:1",
        range: { from: 42, to: 70 },
        flowTop: 40,
        flowBottom: 70,
        height: 30,
        canSplit: false,
        gapBefore: 10,
        group: "wordTable-0:layout:row:0"
      }
    ]);
  });

  it("carries measured source fragments for paragraph and table row line items", () => {
    const paragraph = box("p1", 0, 5, 0, 20, [
      fragment(1, 2, 0),
      fragment(2, 4, 10)
    ]);
    const cellContent = createTableCellSourceBox({
      id: "wordTable-0:cell-0-0",
      range: { from: 11, to: 30 },
      rect: { x: 0, y: 30, width: 100, height: 20 },
      textFragments: [fragment(12, 16, 30)]
    });
    const table = {
      id: "wordTable-0:layout",
      range: { from: 10, to: 40 },
      rect: { x: 0, y: 30, width: 100, height: 20 },
      table: {
        tableId: "wordTable-0",
        fragmentId: "wordTable-0",
        geometryId: "wordTable-0",
        tableRange: { from: 10, to: 40 },
        style: {
          backgroundColor: null,
          borderColor: "#cbd5e1",
          borderWidth: 1
        },
        borders: null,
        rect: { x: 0, y: 30, width: 100, height: 20 },
        tracks: [],
        rows: [
          {
            id: "wordTable-0:row-0",
            sourceRowId: "row:r0",
            rowIndex: 0,
            isHeader: false,
            cantSplit: false,
            range: { from: 11, to: 30 },
            rect: { x: 0, y: 30, width: 100, height: 20 }
          }
        ],
        cells: [
          {
            id: "wordTable-0:cell-0-0",
            semanticCellId: "semantic:r0:c0:g1:1",
            originExplicitCellId: "cell:r0:c0:g1:1",
            explicitCellIds: ["cell:r0:c0:g1:1"],
            originCellPos: 11,
            range: { from: 11, to: 30 },
            shading: null,
            backgroundColor: null,
            borders: null,
            cellMargins: null,
            preferredWidth: null,
            gridRect: { startRow: 0, startColumn: 0, rowSpan: 1, columnSpan: 1 },
            rect: { x: 0, y: 30, width: 100, height: 20 },
            contentRect: { x: 0, y: 30, width: 100, height: 20 },
            contentChildren: []
          }
        ],
        hitTargets: []
      },
      children: [cellContent]
    } satisfies QuireLayoutContainer;

    expect(buildQuireBodyMeasuredContainer([paragraph, table]).items).toMatchObject([
      {
        id: "p1:line:0",
        sourceFragments: [
          {
            kind: "textLine",
            ownerId: "p1",
            range: { from: 1, to: 2 },
            flowTop: 0,
            flowBottom: 10
          }
        ]
      },
      {
        id: "p1:line:1",
        sourceFragments: [
          {
            kind: "textLine",
            ownerId: "p1",
            range: { from: 2, to: 4 },
            flowTop: 10,
            flowBottom: 20
          }
        ]
      },
      {
        id: "wordTable-0:layout:row:0:line:0",
        sourceFragments: [
          {
            kind: "tableCellLine",
            ownerId: "wordTable-0:cell-0-0",
            semanticOwnerId: "semantic:r0:c0:g1:1",
            originOwnerId: "cell:r0:c0:g1:1",
            explicitOwnerIds: ["cell:r0:c0:g1:1"],
            originOwnerPos: 11,
            gridRect: { startRow: 0, startColumn: 0, rowSpan: 1, columnSpan: 1 },
            range: { from: 12, to: 16 },
            flowTop: 30,
            flowBottom: 40
          }
        ]
      }
    ]);
  });

  it("compiles repeated table headers into page-leading bands", () => {
    const table = {
      id: "wordTable-0:layout",
      range: { from: 10, to: 50 },
      rect: { x: 0, y: 12, width: 100, height: 84 },
      table: {
        tableId: "wordTable-0",
        fragmentId: "wordTable-0",
        geometryId: "wordTable-0",
        tableRange: { from: 10, to: 50 },
        style: {
          backgroundColor: null,
          borderColor: "#cbd5e1",
          borderWidth: 1
        },
        borders: null,
        rect: { x: 0, y: 12, width: 100, height: 84 },
        tracks: [],
        rows: [
          {
            id: "wordTable-0:row-0",
            sourceRowId: "row:r0",
            rowIndex: 0,
            isHeader: true,
            cantSplit: false,
            range: { from: 11, to: 20 },
            rect: { x: 0, y: 12, width: 100, height: 28 }
          },
          {
            id: "wordTable-0:row-1",
            sourceRowId: "row:r1",
            rowIndex: 1,
            isHeader: false,
            cantSplit: false,
            range: { from: 21, to: 30 },
            rect: { x: 0, y: 40, width: 100, height: 28 }
          },
          {
            id: "wordTable-0:row-2",
            sourceRowId: "row:r2",
            rowIndex: 2,
            isHeader: false,
            cantSplit: false,
            range: { from: 31, to: 40 },
            rect: { x: 0, y: 68, width: 100, height: 28 }
          }
        ],
        cells: [],
        hitTargets: []
      }
    } satisfies QuireLayoutBox;

    expect(withoutSourceFragments(buildQuireBodyMeasuredContainer([table]).items)).toEqual([
      {
        id: "wordTable-0:layout:row:0",
        range: { from: 11, to: 20 },
        flowTop: 12,
        flowBottom: 40,
        height: 28,
        canSplit: false
      },
      {
        id: "wordTable-0:layout:row:1",
        range: { from: 21, to: 30 },
        flowTop: 40,
        flowBottom: 68,
        height: 28,
        canSplit: false,
        pageLeadingBand: {
          id: "repeated-table-header:wordTable-0",
          height: 28,
          continuationState: {
            repeatedTableHeaders: {
              tableId: "wordTable-0",
              rowIndexes: [0],
              rows: [
                {
                  rowIndex: 0,
                  sourceRowId: "row:r0",
                  range: { from: 11, to: 20 },
                  height: 28
                }
              ],
              height: 28
            }
          }
        }
      },
      {
        id: "wordTable-0:layout:row:2",
        range: { from: 31, to: 40 },
        flowTop: 68,
        flowBottom: 96,
        height: 28,
        canSplit: false,
        pageLeadingBand: {
          id: "repeated-table-header:wordTable-0",
          height: 28,
          continuationState: {
            repeatedTableHeaders: {
              tableId: "wordTable-0",
              rowIndexes: [0],
              rows: [
                {
                  rowIndex: 0,
                  sourceRowId: "row:r0",
                  range: { from: 11, to: 20 },
                  height: 28
                }
              ],
              height: 28
            }
          }
        }
      }
    ]);
  });

  it("does not reuse row-spanning cell text when measuring later rows", () => {
    const spanningCellContent = createTableCellSourceBox({
      id: "wordTable-0:cell-0-0",
      range: { from: 11, to: 20 },
      rect: { x: 0, y: 0, width: 50, height: 84 },
      textFragments: [fragment(12, 16, 0)]
    });
    const rowOneCellContent = createTableCellSourceBox({
      id: "wordTable-0:cell-1-1",
      range: { from: 31, to: 40 },
      rect: { x: 50, y: 28, width: 50, height: 28 },
      textFragments: [fragment(32, 36, 28)]
    });
    const rowTwoCellContent = createTableCellSourceBox({
      id: "wordTable-0:cell-2-1",
      range: { from: 51, to: 60 },
      rect: { x: 50, y: 56, width: 50, height: 28 },
      textFragments: [fragment(52, 56, 56)]
    });
    const table = {
      id: "wordTable-0:layout",
      range: { from: 10, to: 70 },
      rect: { x: 0, y: 0, width: 100, height: 84 },
      table: {
        tableId: "wordTable-0",
        fragmentId: "wordTable-0",
        geometryId: "wordTable-0",
        tableRange: { from: 10, to: 70 },
        style: {
          backgroundColor: null,
          borderColor: "#cbd5e1",
          borderWidth: 1
        },
        borders: null,
        rect: { x: 0, y: 0, width: 100, height: 84 },
        tracks: [],
        rows: [
          {
            id: "wordTable-0:row-0",
            sourceRowId: "row:r0",
            rowIndex: 0,
            isHeader: false,
            cantSplit: false,
            range: { from: 11, to: 20 },
            rect: { x: 0, y: 0, width: 100, height: 28 }
          },
          {
            id: "wordTable-0:row-1",
            sourceRowId: "row:r1",
            rowIndex: 1,
            isHeader: false,
            cantSplit: false,
            range: { from: 31, to: 40 },
            rect: { x: 0, y: 28, width: 100, height: 28 }
          },
          {
            id: "wordTable-0:row-2",
            sourceRowId: "row:r2",
            rowIndex: 2,
            isHeader: false,
            cantSplit: false,
            range: { from: 51, to: 60 },
            rect: { x: 0, y: 56, width: 100, height: 28 }
          }
        ],
        cells: [
          {
            id: "wordTable-0:cell-0-0",
            semanticCellId: "semantic:r0:c0:g1:3",
            originExplicitCellId: "cell:r0:c0:g1:3",
            explicitCellIds: [
              "cell:r0:c0:g1:3",
              "cell:r1:c0:g1:3",
              "cell:r2:c0:g1:3"
            ],
            originCellPos: 11,
            range: { from: 11, to: 20 },
            shading: null,
            backgroundColor: null,
            borders: null,
            cellMargins: null,
            preferredWidth: null,
            gridRect: { startRow: 0, startColumn: 0, rowSpan: 3, columnSpan: 1 },
            rect: { x: 0, y: 0, width: 50, height: 84 },
            contentRect: { x: 0, y: 0, width: 50, height: 84 },
            contentChildren: []
          },
          {
            id: "wordTable-0:cell-1-1",
            semanticCellId: "semantic:r1:c1:g1:1",
            originExplicitCellId: "cell:r1:c1:g1:1",
            explicitCellIds: ["cell:r1:c1:g1:1"],
            originCellPos: 31,
            range: { from: 31, to: 40 },
            shading: null,
            backgroundColor: null,
            borders: null,
            cellMargins: null,
            preferredWidth: null,
            gridRect: { startRow: 1, startColumn: 1, rowSpan: 1, columnSpan: 1 },
            rect: { x: 50, y: 28, width: 50, height: 28 },
            contentRect: { x: 50, y: 28, width: 50, height: 28 },
            contentChildren: []
          },
          {
            id: "wordTable-0:cell-2-1",
            semanticCellId: "semantic:r2:c1:g1:1",
            originExplicitCellId: "cell:r2:c1:g1:1",
            explicitCellIds: ["cell:r2:c1:g1:1"],
            originCellPos: 51,
            range: { from: 51, to: 60 },
            shading: null,
            backgroundColor: null,
            borders: null,
            cellMargins: null,
            preferredWidth: null,
            gridRect: { startRow: 2, startColumn: 1, rowSpan: 1, columnSpan: 1 },
            rect: { x: 50, y: 56, width: 50, height: 28 },
            contentRect: { x: 50, y: 56, width: 50, height: 28 },
            contentChildren: []
          }
        ],
        hitTargets: []
      },
      children: [
        spanningCellContent,
        rowOneCellContent,
        rowTwoCellContent
      ]
    } satisfies QuireLayoutContainer;

    expect(withoutSourceFragments(buildQuireBodyMeasuredContainer([table]).items)).toEqual([
      {
        id: "wordTable-0:layout:row:0:line:0",
        range: { from: 11, to: 20 },
        flowTop: 0,
        flowBottom: 28,
        height: 28,
        canSplit: false,
        group: "wordTable-0:layout:row:0"
      },
      {
        id: "wordTable-0:layout:row:1:line:0",
        range: { from: 31, to: 40 },
        flowTop: 28,
        flowBottom: 56,
        height: 28,
        canSplit: false,
        group: "wordTable-0:layout:row:1"
      },
      {
        id: "wordTable-0:layout:row:2:line:0",
        range: { from: 51, to: 60 },
        flowTop: 56,
        flowBottom: 84,
        height: 28,
        canSplit: false,
        group: "wordTable-0:layout:row:2"
      }
    ]);
  });

  it("anchors row-spanning continuation text lines to the covered row range", () => {
    const spanningCellContent = createTableCellSourceBox({
      id: "wordTable-0:cell-0-0",
      range: { from: 11, to: 20 },
      rect: { x: 0, y: 0, width: 50, height: 56 },
      textFragments: [
        fragment(10, 12, 24),
        fragment(14, 16, 38)
      ]
    });
    const table = {
      id: "wordTable-0:layout",
      range: { from: 10, to: 50 },
      rect: { x: 0, y: 0, width: 100, height: 56 },
      table: {
        tableId: "wordTable-0",
        fragmentId: "wordTable-0",
        geometryId: "wordTable-0",
        tableRange: { from: 10, to: 50 },
        style: {
          backgroundColor: null,
          borderColor: "#cbd5e1",
          borderWidth: 1
        },
        borders: null,
        rect: { x: 0, y: 0, width: 100, height: 56 },
        tracks: [],
        rows: [
          {
            id: "wordTable-0:row-0",
            sourceRowId: "row:r0",
            rowIndex: 0,
            isHeader: false,
            cantSplit: false,
            range: { from: 11, to: 20 },
            rect: { x: 0, y: 0, width: 100, height: 28 }
          },
          {
            id: "wordTable-0:row-1",
            sourceRowId: "row:r1",
            rowIndex: 1,
            isHeader: false,
            cantSplit: false,
            range: { from: 31, to: 40 },
            rect: { x: 0, y: 28, width: 100, height: 28 }
          }
        ],
        cells: [
          {
            id: "wordTable-0:cell-0-0",
            semanticCellId: "semantic:r0:c0:g1:2",
            originExplicitCellId: "cell:r0:c0:g1:2",
            explicitCellIds: ["cell:r0:c0:g1:2", "cell:r1:c0:g1:2"],
            originCellPos: 11,
            range: { from: 11, to: 20 },
            shading: null,
            backgroundColor: null,
            borders: null,
            cellMargins: null,
            preferredWidth: null,
            gridRect: { startRow: 0, startColumn: 0, rowSpan: 2, columnSpan: 1 },
            rect: { x: 0, y: 0, width: 50, height: 56 },
            contentRect: { x: 0, y: 0, width: 50, height: 56 },
            contentChildren: []
          }
        ],
        hitTargets: []
      },
      children: [spanningCellContent]
    } satisfies QuireLayoutContainer;

    expect(withoutSourceFragments(buildQuireBodyMeasuredContainer([table]).items)).toEqual([
      {
        id: "wordTable-0:layout:row:0",
        range: { from: 11, to: 20 },
        flowTop: 0,
        flowBottom: 28,
        height: 28,
        canSplit: false
      },
      {
        id: "wordTable-0:layout:row:1:line:0",
        range: { from: 31, to: 40 },
        flowTop: 28,
        flowBottom: 38,
        height: 10,
        canSplit: false,
        group: "wordTable-0:layout:row:1"
      },
      {
        id: "wordTable-0:layout:row:1:line:1",
        range: { from: 31, to: 40 },
        flowTop: 38,
        flowBottom: 56,
        height: 18,
        canSplit: false,
        group: "wordTable-0:layout:row:1"
      }
    ]);
  });

  it("assigns table-row text ownership by baseline at row breaks", () => {
    const spanningCellContent = createTableCellSourceBox({
      id: "wordTable-0:cell-0-0",
      range: { from: 11, to: 20 },
      rect: { x: 0, y: 0, width: 50, height: 56 },
      textFragments: [fragment(12, 16, 24)]
    });
    const table = {
      id: "wordTable-0:layout",
      range: { from: 10, to: 50 },
      rect: { x: 0, y: 0, width: 100, height: 56 },
      table: {
        tableId: "wordTable-0",
        fragmentId: "wordTable-0",
        geometryId: "wordTable-0",
        tableRange: { from: 10, to: 50 },
        style: {
          backgroundColor: null,
          borderColor: "#cbd5e1",
          borderWidth: 1
        },
        borders: null,
        rect: { x: 0, y: 0, width: 100, height: 56 },
        tracks: [],
        rows: [
          {
            id: "wordTable-0:row-0",
            sourceRowId: "row:r0",
            rowIndex: 0,
            isHeader: false,
            cantSplit: false,
            range: { from: 11, to: 20 },
            rect: { x: 0, y: 0, width: 100, height: 28 }
          },
          {
            id: "wordTable-0:row-1",
            sourceRowId: "row:r1",
            rowIndex: 1,
            isHeader: false,
            cantSplit: false,
            range: { from: 31, to: 40 },
            rect: { x: 0, y: 28, width: 100, height: 28 }
          }
        ],
        cells: [
          {
            id: "wordTable-0:cell-0-0",
            semanticCellId: "semantic:r0:c0:g1:2",
            originExplicitCellId: "cell:r0:c0:g1:2",
            explicitCellIds: ["cell:r0:c0:g1:2", "cell:r1:c0:g1:2"],
            originCellPos: 11,
            range: { from: 11, to: 20 },
            shading: null,
            backgroundColor: null,
            borders: null,
            cellMargins: null,
            preferredWidth: null,
            gridRect: { startRow: 0, startColumn: 0, rowSpan: 2, columnSpan: 1 },
            rect: { x: 0, y: 0, width: 50, height: 56 },
            contentRect: { x: 0, y: 0, width: 50, height: 56 },
            contentChildren: []
          }
        ],
        hitTargets: []
      },
      children: [spanningCellContent]
    } satisfies QuireLayoutContainer;

    expect(withoutSourceFragments(buildQuireBodyMeasuredContainer([table]).items)).toEqual([
      {
        id: "wordTable-0:layout:row:0",
        range: { from: 11, to: 20 },
        flowTop: 0,
        flowBottom: 28,
        height: 28,
        canSplit: false
      },
      {
        id: "wordTable-0:layout:row:1:line:0",
        range: { from: 31, to: 40 },
        flowTop: 28,
        flowBottom: 56,
        height: 28,
        canSplit: false,
        group: "wordTable-0:layout:row:1"
      }
    ]);
  });

  it("keeps cant-split table rows as one measured item even when text has lines", () => {
    const cellContent = createTableCellSourceBox({
      id: "wordTable-0:cell-0-0",
      range: { from: 11, to: 20 },
      rect: { x: 0, y: 12, width: 100, height: 40 },
      children: [
        {
          id: "wordTable-0:cell-0-0:p",
          range: { from: 12, to: 18 },
          rect: { x: 0, y: 12, width: 80, height: 20 },
          textFragments: [fragment(12, 14, 12), fragment(14, 18, 22)]
        }
      ]
    });
    const table = {
      id: "wordTable-0:layout",
      range: { from: 10, to: 30 },
      rect: { x: 0, y: 12, width: 100, height: 40 },
      table: {
        tableId: "wordTable-0",
        fragmentId: "wordTable-0",
        geometryId: "wordTable-0",
        tableRange: { from: 10, to: 30 },
        style: {
          backgroundColor: null,
          borderColor: "#cbd5e1",
          borderWidth: 1
        },
        borders: null,
        rect: { x: 0, y: 12, width: 100, height: 40 },
        tracks: [],
        rows: [
          {
            id: "wordTable-0:row-0",
            sourceRowId: "row:r0",
            rowIndex: 0,
            isHeader: false,
            cantSplit: true,
            range: { from: 11, to: 20 },
            rect: { x: 0, y: 12, width: 100, height: 40 }
          }
        ],
        cells: [
          {
            id: "wordTable-0:cell-0-0",
            semanticCellId: "semantic:r0:c0:g1:1",
            originExplicitCellId: "cell:r0:c0:g0:1",
            explicitCellIds: ["cell:r0:c0:g0:1"],
            originCellPos: 11,
            range: { from: 11, to: 20 },
            shading: null,
            backgroundColor: null,
            borders: null,
            cellMargins: null,
            preferredWidth: null,
            gridRect: { startRow: 0, startColumn: 0, rowSpan: 1, columnSpan: 1 },
            rect: { x: 0, y: 12, width: 100, height: 40 },
            contentRect: { x: 0, y: 12, width: 100, height: 40 },
            contentChildren: []
          }
        ],
        hitTargets: []
      },
      children: [cellContent]
    } satisfies QuireLayoutContainer;

    expect(buildQuireBodyMeasuredContainer([table]).items).toEqual([
      {
        id: "wordTable-0:layout:row:0",
        range: { from: 11, to: 20 },
        flowTop: 12,
        flowBottom: 52,
        height: 40,
        canSplit: false
      }
    ]);
  });
});

/** Minimal measured-source cache used by hot-path identity tests. */
class TestMeasuredSourceCache implements QuireMeasuredSourceCacheAdapter {
  /** Box-local measured items keyed by source layout box identity. */
  private readonly store = new WeakMap<
    QuireLayoutBox,
    readonly QuireMeasuredContainerItem[]
  >();

  /** Source layout boxes read through the box-local cache in this test. */
  readonly getCalls: string[] = [];

  /** Last body-level measured container stored by the builder. */
  private body:
    | {
        /** Top-level layout boxes from the stored body container build. */
        readonly boxes: readonly QuireLayoutBox[];
        /** Measured body container produced for those boxes. */
        readonly container: QuireMeasuredContainer;
        /** Body item spans owned by each top-level layout box. */
        readonly spans: readonly { readonly itemStart: number; readonly itemEnd: number }[];
      }
    | undefined;

  /**
   * Clears recorded box-local cache reads.
   *
   * @returns Nothing.
   */
  resetGetCalls(): void {
    this.getCalls.length = 0;
  }

  /**
   * Reads cached measured items for a layout box.
   *
   * @param box - Source layout box.
   * @returns Cached items, or undefined on the first pass.
   */
  get(box: QuireLayoutBox): readonly QuireMeasuredContainerItem[] | undefined {
    this.getCalls.push(box.id);

    return this.store.get(box);
  }

  /**
   * Stores measured items for a layout box.
   *
   * @param box - Source layout box.
   * @param items - Box-local measured items.
   * @returns Nothing.
   */
  set(box: QuireLayoutBox, items: readonly QuireMeasuredContainerItem[]): void {
    this.store.set(box, items);
  }

  /**
   * Reads a reusable body prefix before the current dirty range.
   *
   * @param boxes - Current top-level layout boxes.
   * @param dirtyRange - Current changed document range.
   * @returns Reusable body prefix, or undefined when unavailable.
   */
  getBodyPrefix(
    boxes: readonly QuireLayoutBox[],
    dirtyRange: QuireLayoutBox["range"]
  ):
    | {
        /** Reusable measured body items from the previous pass. */
        readonly items: readonly QuireMeasuredContainerItem[];
        /** Exclusive item index where the reusable prefix ends. */
        readonly itemEnd: number;
        /** Reusable per-box body item spans. */
        readonly spans: readonly { readonly itemStart: number; readonly itemEnd: number }[];
        /** Number of top-level boxes represented by the prefix. */
        readonly boxCount: number;
        /** Flow bottom after the final reused body item. */
        readonly previousBottom: number | null;
      }
    | undefined {
    if (this.body === undefined) {
      return undefined;
    }

    let boxCount = 0;
    while (
      boxCount < boxes.length &&
      boxes[boxCount] === this.body.boxes[boxCount] &&
      boxes[boxCount]!.range.to <= dirtyRange.from
    ) {
      boxCount += 1;
    }

    if (boxCount === 0) {
      return undefined;
    }

    const itemEnd = this.body.spans[boxCount - 1]?.itemEnd ?? 0;
    const lastItem = this.body.container.items[itemEnd - 1];

    return {
      items: this.body.container.items,
      itemEnd,
      spans: this.body.spans.slice(0, boxCount),
      boxCount,
      previousBottom: lastItem?.flowBottom ?? null
    };
  }

  /**
   * Stores the full measured body container produced by the current pass.
   *
   * @param boxes - Top-level layout boxes used to build the body.
   * @param container - Measured body container produced for those boxes.
   * @param spans - Body item spans owned by each top-level box.
   * @returns Nothing.
   */
  setBodyContainer(
    boxes: readonly QuireLayoutBox[],
    container: QuireMeasuredContainer,
    spans: readonly { readonly itemStart: number; readonly itemEnd: number }[]
  ): void {
    this.body = { boxes, container, spans };
  }
}
