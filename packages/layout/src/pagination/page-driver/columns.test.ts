import { describe, expect, it } from "vitest";
import type { QuireMeasuredContainer, QuireMeasuredContainerItem } from "../container";
import { createQuirePaginationGeometryKey, resolveQuirePageGeometryForIndex } from "../geometry";
import type { QuirePageGeometry } from "../geometry";
import { driveQuireMeasuredContainerPages } from "../page-driver";

/** Two 40px columns with a 20px gap in a 100px body, 25px tall, on 30px pages. */
const twoColumnGeometry: QuirePageGeometry = {
  pageRect: { x: 0, y: 0, width: 100, height: 30 },
  bodyRect: { x: 0, y: 0, width: 100, height: 25 },
  columns: {
    columns: [{ offset: 0, width: 40 }, { offset: 60, width: 40 }],
    separator: true,
    measureWidth: 40
  }
};

/**
 * Builds a measured container of indivisible 10px items.
 *
 * @param count - Number of items, item `i` covering document range `[i, i + 1]`.
 * @param overrides - Optional per-item field overrides.
 * @returns Measured container.
 */
function container(
  count: number,
  overrides: Readonly<Record<number, Partial<QuireMeasuredContainerItem>>> = {}
): QuireMeasuredContainer {
  return {
    id: "body",
    range: { from: 0, to: count },
    items: Array.from({ length: count }, (_, index) => ({
      id: `item-${index}`,
      range: { from: index, to: index + 1 },
      flowTop: index * 10,
      flowBottom: index * 10 + 10,
      height: 10,
      canSplit: false,
      ...overrides[index]
    }))
  };
}

describe("multi-column page driving", () => {
  it("resolves column rectangles that move with each page", () => {
    expect(resolveQuirePageGeometryForIndex(twoColumnGeometry, 1).columnRects).toEqual([
      { x: 0, y: 30, width: 40, height: 25 },
      { x: 60, y: 30, width: 40, height: 25 }
    ]);
    expect(resolveQuirePageGeometryForIndex(
      { ...twoColumnGeometry, columns: undefined },
      0
    ).columnRects).toBeUndefined();
  });

  it("keeps a column's leading band state in that column only", () => {
    const band = { id: "band", height: 5, continuationState: { fixtureBand: { ownerId: "owner" } } };
    const { fragments } = driveQuireMeasuredContainerPages({
      container: container(6, { 2: { pageLeadingBand: band } }),
      pageGeometry: twoColumnGeometry
    });

    // Only the column that starts at the banded item carries its state; later columns and pages do not inherit it.
    expect(fragments[0]?.columns?.map((column) => column.endInfo?.continuationState)).toEqual([undefined, band.continuationState]);
    expect(fragments[1]?.columns?.map((column) => column.endInfo?.continuationState)).toEqual([undefined]);
  });

  it("fills the first column, then the second, then the next page", () => {
    const { fragments } = driveQuireMeasuredContainerPages({
      container: container(6),
      pageGeometry: twoColumnGeometry
    });

    expect(fragments.map((page) => page.range)).toEqual([
      { from: 0, to: 4 },
      { from: 4, to: 6 }
    ]);
    expect(fragments[0]?.columns?.map((column) => ({
      columnIndex: column.columnIndex,
      range: column.range,
      x: column.bodyRect.x,
      sourceFlowY: column.sourceFlowY,
      sourceFlowHeight: column.sourceFlowHeight
    }))).toEqual([
      { columnIndex: 0, range: { from: 0, to: 2 }, x: 0, sourceFlowY: 0, sourceFlowHeight: 20 },
      { columnIndex: 1, range: { from: 2, to: 4 }, x: 60, sourceFlowY: 20, sourceFlowHeight: 20 }
    ]);
    expect(fragments[0]).toMatchObject({ sourceFlowY: 0, sourceFlowHeight: 40 });
    expect(fragments[0]?.columnSeparators).toEqual([{ x: 50, y: 0, width: 0, height: 25 }]);
    expect(fragments[1]?.columnSeparators).toBeUndefined();
    expect(fragments[1]?.columns?.map((column) => column.range)).toEqual([{ from: 4, to: 6 }]);
  });

  it("ends the page at a forced page break and leaves later columns empty", () => {
    const { fragments } = driveQuireMeasuredContainerPages({
      container: container(4, { 0: { breakAfter: "page" } }),
      pageGeometry: twoColumnGeometry
    });

    expect(fragments.map((page) => page.columns?.map((column) => column.range))).toEqual([
      [{ from: 0, to: 1 }],
      [{ from: 1, to: 3 }, { from: 3, to: 4 }]
    ]);
  });

  it("keeps single-column pagination unchanged when no template is present", () => {
    const { fragments } = driveQuireMeasuredContainerPages({
      container: container(6),
      pageGeometry: { ...twoColumnGeometry, columns: undefined }
    });

    expect(fragments.map((page) => page.range)).toEqual([
      { from: 0, to: 2 },
      { from: 2, to: 4 },
      { from: 4, to: 6 }
    ]);
    expect(fragments.every((page) => page.columns === undefined)).toBe(true);
  });

  it("separates cache keys for different column templates", () => {
    const single = createQuirePaginationGeometryKey({
      pageGeometry: { ...twoColumnGeometry, columns: undefined }
    });
    const double = createQuirePaginationGeometryKey({ pageGeometry: twoColumnGeometry });

    expect(single).not.toBe(double);
  });

  it("balances the last page's columns to the smallest common height", () => {
    const { fragments } = driveQuireMeasuredContainerPages({
      container: container(3),
      pageGeometry: { ...twoColumnGeometry, balanceLastPageColumns: true }
    });

    expect(fragments).toHaveLength(1);
    expect(fragments[0]?.columns?.map((column) => column.range)).toEqual([
      { from: 0, to: 2 },
      { from: 2, to: 3 }
    ]);
    const separator = fragments[0]?.columnSeparators?.[0];
    expect(separator?.height).toBeGreaterThanOrEqual(20);
    expect(separator?.height).toBeLessThan(20.5);
  });

  it("does not balance pages before the last one", () => {
    const { fragments } = driveQuireMeasuredContainerPages({
      container: container(6),
      pageGeometry: { ...twoColumnGeometry, balanceLastPageColumns: true }
    });

    expect(fragments[0]?.columns?.map((column) => column.range)).toEqual([
      { from: 0, to: 2 },
      { from: 2, to: 4 }
    ]);
    expect(fragments[1]?.columns?.map((column) => column.range)).toEqual([
      { from: 4, to: 5 },
      { from: 5, to: 6 }
    ]);
  });

  it("starts the first page below content already on it", () => {
    const geometry = resolveQuirePageGeometryForIndex({ ...twoColumnGeometry, firstPageBodyTop: 15 }, 0);
    const { fragments } = driveQuireMeasuredContainerPages({
      container: container(3),
      pageGeometry: { ...twoColumnGeometry, firstPageBodyTop: 15 }
    });

    expect(geometry.bodyRect).toEqual({ x: 0, y: 15, width: 100, height: 10 });
    expect(geometry.columnRects?.[1]).toEqual({ x: 60, y: 15, width: 40, height: 10 });
    expect(resolveQuirePageGeometryForIndex({ ...twoColumnGeometry, firstPageBodyTop: 15 }, 1).bodyRect.y).toBe(30);
    expect(fragments[0]?.columns?.map((column) => column.range)).toEqual([
      { from: 0, to: 1 },
      { from: 1, to: 2 }
    ]);
  });

  it("moves to the next column at a column break and to the next page from the last column", () => {
    const { fragments } = driveQuireMeasuredContainerPages({
      container: container(4, { 0: { breakAfter: "column" }, 1: { breakAfter: "column" } }),
      pageGeometry: twoColumnGeometry
    });

    expect(fragments.map((page) => page.columns?.map((column) => column.range))).toEqual([
      [{ from: 0, to: 1 }, { from: 1, to: 2 }],
      [{ from: 2, to: 4 }]
    ]);
  });

  it("treats a column break as a page break on a single-column page", () => {
    const { fragments } = driveQuireMeasuredContainerPages({
      container: container(2, { 0: { breakAfter: "column" } }),
      pageGeometry: { ...twoColumnGeometry, columns: undefined }
    });

    expect(fragments.map((page) => page.range)).toEqual([{ from: 0, to: 1 }, { from: 1, to: 2 }]);
  });
});
