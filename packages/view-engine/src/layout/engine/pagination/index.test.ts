import { describe, expect, it } from "vitest";
import {
  createQuirePaginationGeometryKey,
  paginateQuireLayoutDocument
} from ".";
import { createQuirePaginationCheckpointStore } from "@quirekit/layout/pagination";
import {
  createLayoutDocument,
  createLineFragments,
  createPageGeometry,
  summarizePageSourceFlowBands
} from "../../../../test-support/layout/pagination";

describe("canvas layout pagination", () => {
  it("includes page-position body variants in retained pagination identity", () => {
    const base = createPageGeometry(70);
    const first = createQuirePaginationGeometryKey({
      pageGeometry: {
        ...base,
        bodyRectVariants: {
          first: { ...base.bodyRect, height: 40 }
        }
      }
    });
    const second = createQuirePaginationGeometryKey({
      pageGeometry: {
        ...base,
        bodyRectVariants: {
          first: { ...base.bodyRect, height: 50 }
        }
      }
    });

    expect(first).not.toBe(second);
  });

  it("derives page fragments from top-level block ranges", () => {
    const document = createLayoutDocument([
      { id: "paragraph-0", from: 0, to: 4, y: 0, height: 30 },
      { id: "paragraph-1", from: 4, to: 8, y: 38, height: 40 },
      { id: "paragraph-2", from: 8, to: 12, y: 86, height: 20 }
    ]);

    expect(paginateQuireLayoutDocument({
      document,
      pageGeometry: createPageGeometry(70)
    }).pages).toEqual([
      {
        pageIndex: 0,
        range: { from: 0, to: 4 },
        pageRect: { x: 0, y: 0, width: 600, height: 800 },
        bodyRect: { x: 40, y: 50, width: 500, height: 70 },
        rect: { x: 40, y: 50, width: 500, height: 30 },
        sourceFlowY: 0,
        sourceFlowHeight: 30,
        endInfo: { openMarks: [], openNodes: [] }
      },
      {
        pageIndex: 1,
        range: { from: 4, to: 12 },
        pageRect: { x: 0, y: 800, width: 600, height: 800 },
        bodyRect: { x: 40, y: 850, width: 500, height: 70 },
        rect: { x: 40, y: 850, width: 500, height: 68 },
        sourceFlowY: 38,
        sourceFlowHeight: 68,
        endInfo: { openMarks: [], openNodes: [] }
      }
    ]);
  });

  it("collects source-flow metadata only for clipped projection pages", () => {
    const document = createLayoutDocument([
      { id: "paragraph-0", from: 0, to: 4, y: 0, height: 30 },
      { id: "paragraph-1", from: 4, to: 8, y: 38, height: 40 },
      { id: "paragraph-2", from: 8, to: 12, y: 86, height: 20 }
    ]);
    const paginated = paginateQuireLayoutDocument({
      document,
      pageGeometry: createPageGeometry(70),
      projectionClipRects: [{ x: 0, y: 800, width: 600, height: 800 }]
    });

    expect(paginated.pages[0]?.sourceFlowY).toBeUndefined();
    expect(paginated.pages[0]?.sourceFlowHeight).toBeUndefined();
    expect(paginated.pages[1]).toEqual(
      expect.objectContaining({
        sourceFlowY: 38,
        sourceFlowHeight: 68
      })
    );
    expect(paginated.children.map((child) => child.id)).toEqual([
      "paragraph-1",
      "paragraph-2"
    ]);
  });

  it("places an oversized top-level block on its own overflowing page", () => {
    const document = createLayoutDocument([
      { id: "image-0", from: 0, to: 2, y: 0, height: 96 },
      { id: "paragraph-0", from: 2, to: 6, y: 104, height: 24 }
    ]);

    expect(paginateQuireLayoutDocument({
      document,
      pageGeometry: createPageGeometry(70)
    }).pages).toEqual([
      expect.objectContaining({
        pageIndex: 0,
        range: { from: 0, to: 2 },
        rect: { x: 40, y: 50, width: 500, height: 96 }
      }),
      expect.objectContaining({
        pageIndex: 1,
        range: { from: 2, to: 6 },
        rect: { x: 40, y: 850, width: 500, height: 24 }
      })
    ]);
  });

  it("moves a full-width floating-table footprint to a fresh page before projection", () => {
    const base = createLayoutDocument([
      { id: "paragraph-before", from: 0, to: 5, y: 0, height: 60 },
      { id: "floating-table:layout", from: 5, to: 15, y: 60, height: 50 },
      { id: "paragraph-after", from: 15, to: 20, y: 110, height: 20 }
    ]);
    const sourceTable = base.children[1]!;
    const document = {
      ...base,
      children: [
        base.children[0]!,
        {
          ...sourceTable,
          table: {
            tableId: "floating-table",
            fragmentId: "floating-table",
            geometryId: "floating-table",
            tableRange: sourceTable.range,
            style: {
              backgroundColor: null,
              borderColor: "#cbd5e1",
              borderWidth: 1
            },
            borders: null,
            floating: {
              horizontal: {
                reference: "margin" as const,
                offset: 0,
                alignment: null
              },
              vertical: {
                reference: "text" as const,
                offset: 10,
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
            rect: { x: 0, y: 60, width: 500, height: 40 },
            tracks: [],
            rows: [],
            cells: [],
            hitTargets: []
          }
        },
        base.children[2]!
      ]
    };

    const paginated = paginateQuireLayoutDocument({
      document,
      pageGeometry: createPageGeometry(80)
    });
    const projectedTable = paginated.children.find((child) =>
      child.id === "floating-table:layout"
    );
    const followingParagraph = paginated.children.find((child) =>
      child.id === "paragraph-after"
    );

    expect(paginated.pages.map((page) => page.range)).toEqual([
      { from: 0, to: 5 },
      { from: 5, to: 20 }
    ]);
    expect(projectedTable?.rect).toEqual({
      x: 40,
      y: 850,
      width: 500,
      height: 50
    });
    expect(projectedTable?.table?.rect).toEqual({
      x: 40,
      y: 860,
      width: 500,
      height: 40
    });
    expect(followingParagraph?.rect.y).toBe(900);
    expect(
      projectedTable!.table!.rect.y + projectedTable!.table!.rect.height
    ).toBeLessThanOrEqual(paginated.pages[1]!.bodyRect.y + 80);
  });

  it("splits an oversized text block into line-bounded page fragments", () => {
    const document = createLayoutDocument([
      {
        id: "paragraph-0",
        from: 1,
        to: 13,
        y: 0,
        height: 96,
        textFragments: createLineFragments({ lineCount: 4, y: 0 })
      }
    ]);

    const paginated = paginateQuireLayoutDocument({
      document,
      pageGeometry: createPageGeometry(48)
    });

    expect(paginated.pages).toEqual([
      expect.objectContaining({
        pageIndex: 0,
        range: { from: 1, to: 7 },
        rect: { x: 40, y: 50, width: 500, height: 48 }
      }),
      expect.objectContaining({
        pageIndex: 1,
        range: { from: 7, to: 13 },
        rect: { x: 40, y: 850, width: 500, height: 48 }
      })
    ]);
    expect(summarizePageSourceFlowBands(paginated.pages)).toEqual([
      { pageIndex: 0, sourceFlowY: 0, sourceFlowHeight: 48 },
      { pageIndex: 1, sourceFlowY: 48, sourceFlowHeight: 48 }
    ]);
  });

  it("pushes an overflowing text block to a fresh page before line splitting", () => {
    const document = createLayoutDocument([
      { id: "paragraph-0", from: 0, to: 1, y: 0, height: 30 },
      {
        id: "paragraph-1",
        from: 1,
        to: 13,
        y: 38,
        height: 96,
        textFragments: createLineFragments({ lineCount: 4, y: 38 })
      }
    ]);

    expect(paginateQuireLayoutDocument({
      document,
      pageGeometry: createPageGeometry(48)
    }).pages).toEqual([
      expect.objectContaining({
        pageIndex: 0,
        range: { from: 0, to: 1 },
        rect: { x: 40, y: 50, width: 500, height: 30 }
      }),
      expect.objectContaining({
        pageIndex: 1,
        range: { from: 1, to: 7 },
        rect: { x: 40, y: 850, width: 500, height: 48 }
      }),
      expect.objectContaining({
        pageIndex: 2,
        range: { from: 7, to: 13 },
        rect: { x: 40, y: 1650, width: 500, height: 48 }
      })
    ]);
  });

  it("uses remaining page height before continuing a splittable text block", () => {
    const document = createLayoutDocument([
      { id: "paragraph-0", from: 0, to: 1, y: 0, height: 30 },
      {
        id: "paragraph-1",
        from: 1,
        to: 13,
        y: 38,
        height: 96,
        textFragments: createLineFragments({ lineCount: 4, y: 38 })
      }
    ]);

    const paginated = paginateQuireLayoutDocument({
      document,
      pageGeometry: createPageGeometry(70)
    });

    expect(paginated.pages).toEqual([
      expect.objectContaining({
        pageIndex: 0,
        range: { from: 0, to: 4 },
        rect: { x: 40, y: 50, width: 500, height: 62 }
      }),
      expect.objectContaining({
        pageIndex: 1,
        range: { from: 4, to: 10 },
        rect: { x: 40, y: 850, width: 500, height: 48 }
      }),
      expect.objectContaining({
        pageIndex: 2,
        range: { from: 10, to: 13 },
        rect: { x: 40, y: 1650, width: 500, height: 24 }
      })
    ]);
    expect(summarizePageSourceFlowBands(paginated.pages)).toEqual([
      { pageIndex: 0, sourceFlowY: 0, sourceFlowHeight: 62 },
      { pageIndex: 1, sourceFlowY: 62, sourceFlowHeight: 48 },
      { pageIndex: 2, sourceFlowY: 110, sourceFlowHeight: 24 }
    ]);
  });

  it("keeps a text continuation page open for following complete blocks", () => {
    const document = createLayoutDocument([
      { id: "paragraph-0", from: 0, to: 1, y: 0, height: 30 },
      {
        id: "paragraph-1",
        from: 1,
        to: 10,
        y: 38,
        height: 72,
        textFragments: createLineFragments({ lineCount: 3, y: 38 })
      },
      { id: "paragraph-2", from: 10, to: 13, y: 118, height: 20 }
    ]);

    expect(paginateQuireLayoutDocument({
      document,
      pageGeometry: createPageGeometry(80)
    }).pages).toEqual([
      expect.objectContaining({
        pageIndex: 0,
        range: { from: 0, to: 4 },
        rect: { x: 40, y: 50, width: 500, height: 62 }
      }),
      expect.objectContaining({
        pageIndex: 1,
        range: { from: 4, to: 13 },
        rect: { x: 40, y: 850, width: 500, height: 76 }
      })
    ]);
  });

  it("keeps the last page of a page-top text split open for following blocks", () => {
    const document = createLayoutDocument([
      {
        id: "paragraph-0",
        from: 1,
        to: 10,
        y: 0,
        height: 72,
        textFragments: createLineFragments({ lineCount: 3, y: 0 })
      },
      { id: "paragraph-1", from: 10, to: 13, y: 80, height: 20 }
    ]);

    expect(paginateQuireLayoutDocument({
      document,
      pageGeometry: createPageGeometry(70)
    }).pages).toEqual([
      expect.objectContaining({
        pageIndex: 0,
        range: { from: 1, to: 7 },
        rect: { x: 40, y: 50, width: 500, height: 48 }
      }),
      expect.objectContaining({
        pageIndex: 1,
        range: { from: 7, to: 13 },
        rect: { x: 40, y: 850, width: 500, height: 52 }
      })
    ]);
  });

  it("reuses page-drive prefix pages before an intra-paragraph dirty range", () => {
    const cache = createQuirePaginationCheckpointStore();
    const document = createLayoutDocument([
      {
        id: "paragraph-0",
        from: 1,
        to: 31,
        y: 0,
        height: 240,
        textFragments: createLineFragments({ lineCount: 10, y: 0 })
      }
    ]);

    const first = paginateQuireLayoutDocument({
      document,
      pageGeometry: createPageGeometry(48),
      paginationCheckpointStore: cache
    });

    expect(first.pages.map((page) => page.range)).toEqual([
      { from: 1, to: 7 },
      { from: 7, to: 13 },
      { from: 13, to: 19 },
      { from: 19, to: 25 },
      { from: 25, to: 31 }
    ]);
    expect(cache.snapshot()).toMatchObject({
      prefixHits: 0,
      prefixMisses: 0,
      prefixPagesReused: 0,
      stores: 1
    });

    paginateQuireLayoutDocument({
      document,
      pageGeometry: createPageGeometry(48),
      paginationCheckpointStore: cache,
      layoutDirtyRange: {
        reason: "content",
        changedRange: { from: 19, to: 20 },
        firstTopLevelBlockIndex: 0,
        firstTopLevelBlockRange: { from: 1, to: 31 }
      }
    });

    expect(cache.snapshot()).toMatchObject({
      prefixHits: 1,
      prefixMisses: 0,
      prefixPagesReused: 3,
      stores: 2
    });
  });
});
