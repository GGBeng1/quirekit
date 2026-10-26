import { describe, expect, it } from "vitest";
import type { QuireMeasuredContainer, QuireMeasuredContainerItem } from "../container";
import { resolveQuirePageGeometryForIndex, type QuirePageGeometry } from "../geometry";
import { driveQuireMeasuredContainerPages } from "../page-driver";

/** Single-column pages with a 100px body. */
const pageGeometry: QuirePageGeometry = {
  pageRect: { x: 0, y: 0, width: 100, height: 120 },
  bodyRect: { x: 0, y: 10, width: 100, height: 100 }
};

/**
 * Builds a container of 10px indivisible items.
 *
 * @param count - Number of items.
 * @param overrides - Per-item field overrides.
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

describe("page-bottom notes", () => {
  it("reserves the note area and its separator below the body content", () => {
    const { fragments } = driveQuireMeasuredContainerPages({
      container: container(10, { 1: { notes: [{ id: "a", height: 25 }] } }),
      pageGeometry,
      noteSeparatorHeight: 5
    });

    // 10 items of 10px no longer fit with a 30px note area: 7 stay on page 1.
    expect(fragments.map((page) => page.range)).toEqual([{ from: 0, to: 7 }, { from: 7, to: 10 }]);
    expect(fragments[0]).toMatchObject({ notes: [{ id: "a", offset: 0, height: 25, continuation: false }], noteAreaHeight: 30 });
    expect(fragments[1]?.notes).toBeUndefined();
  });

  it("moves a line to the next page when its note would not fit below it", () => {
    const { fragments } = driveQuireMeasuredContainerPages({
      container: container(10, { 8: { notes: [{ id: "a", height: 20 }] } }),
      pageGeometry,
      noteSeparatorHeight: 5
    });

    // Line 9 ends at 90px; with its 25px note area it would need 115px.
    expect(fragments.map((page) => page.range)).toEqual([{ from: 0, to: 8 }, { from: 8, to: 10 }]);
    expect(fragments[1]?.notes).toEqual([{ id: "a", offset: 0, height: 20, continuation: false }]);
  });

  it("keeps notes with their column on multi-column pages", () => {
    const { fragments } = driveQuireMeasuredContainerPages({
      container: container(4, { 3: { notes: [{ id: "b", height: 15 }] } }),
      pageGeometry: {
        ...pageGeometry,
        bodyRect: { ...pageGeometry.bodyRect, height: 30 },
        columns: { columns: [{ offset: 0, width: 45 }, { offset: 55, width: 45 }], separator: false, measureWidth: 45 }
      },
      noteSeparatorHeight: 5
    });

    expect(fragments[0]?.columns?.map((column) => [column.range, column.notes?.map((note) => note.id) ?? []])).toEqual([
      [{ from: 0, to: 3 }, []],
      [{ from: 3, to: 4 }, ["b"]]
    ]);
    expect(fragments[0]?.columns?.[1]?.noteAreaHeight).toBe(20);
  });

  it("continues a long note on the next page at a line boundary", () => {
    const { fragments } = driveQuireMeasuredContainerPages({
      container: container(10, { 5: { notes: [{ id: "long", height: 80, lines: [20, 40, 60, 80] }] } }),
      pageGeometry,
      noteSeparatorHeight: 5,
      noteContinuationSeparatorHeight: 3
    });

    // Line 6 ends at 60px, leaving 35px below the 5px separator: one 20px note
    // line fits, so line 6 stays and the rest of its note continues.
    expect(fragments[0]?.range).toEqual({ from: 0, to: 6 });
    expect(fragments[0]?.notes).toEqual([{ id: "long", offset: 0, height: 20, continuation: false }]);
    expect(fragments[1]?.notes).toEqual([{ id: "long", offset: 20, height: 60, continuation: true }]);
    expect(fragments[1]?.noteAreaHeight).toBe(63);
    expect(fragments.at(-1)?.range.to).toBe(10);
  });

  it("moves the line when not even the first note line fits", () => {
    const { fragments } = driveQuireMeasuredContainerPages({
      container: container(10, { 9: { notes: [{ id: "x", height: 40, lines: [20, 40] }] } }),
      pageGeometry,
      noteSeparatorHeight: 5
    });

    // Line 10 ends at 100px: nothing of its note fits below it.
    expect(fragments.map((page) => page.range)).toEqual([{ from: 0, to: 9 }, { from: 9, to: 10 }]);
    expect(fragments[1]?.notes).toEqual([{ id: "x", offset: 0, height: 40, continuation: false }]);
  });
});

describe("notes on a balanced column page", () => {
  const columns: QuirePageGeometry = {
    ...pageGeometry,
    columns: { columns: [{ offset: 0, width: 45 }, { offset: 55, width: 45 }], separator: false, measureWidth: 45 },
    balanceLastPageColumns: true
  };

  it("balances body text only and leaves the notes at the page bottom", () => {
    const { fragments } = driveQuireMeasuredContainerPages({
      container: container(6, { 1: { notes: [{ id: "a", height: 15 }] } }),
      pageGeometry: columns,
      noteSeparatorHeight: 5
    });

    expect(fragments).toHaveLength(1);
    expect(fragments[0]?.columns?.map((column) => column.range)).toEqual([{ from: 0, to: 3 }, { from: 3, to: 6 }]);
    expect(fragments[0]?.columns?.[0]).toMatchObject({ notes: [{ id: "a", height: 15 }], noteAreaHeight: 20 });
    expect(fragments[0]?.noteAreaBottom).toBe(110);
  });

  it("narrows a shared first page above notes already at its bottom", () => {
    expect(resolveQuirePageGeometryForIndex({ ...pageGeometry, firstPageBodyTop: 40, firstPageBodyBottom: 90 }, 0).bodyRect)
      .toEqual({ x: 0, y: 40, width: 100, height: 50 });
    expect(resolveQuirePageGeometryForIndex({ ...pageGeometry, firstPageBodyBottom: 90 }, 1).bodyRect.height).toBe(100);
  });
});
