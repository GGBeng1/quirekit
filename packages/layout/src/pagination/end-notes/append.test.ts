import { describe, expect, it } from "vitest";
import type { QuireMeasuredContainer, QuireMeasuredContainerItem } from "../container";
import type { QuirePageGeometry } from "../geometry";
import { driveQuireMeasuredContainerPages } from "../page-driver";
import { appendQuireEndNotes } from "./append";

/** Single-column pages with a 100px body and a 20px gap. */
const pageGeometry: QuirePageGeometry = {
  pageRect: { x: 0, y: 0, width: 100, height: 120 },
  bodyRect: { x: 0, y: 10, width: 100, height: 100 },
  pageGap: 20
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

/**
 * Paginates a container and places end notes after it.
 *
 * @param body - Body container.
 * @param notes - End notes in order.
 * @param geometry - Page geometry.
 * @returns Fragments with end-note areas.
 */
function layout(
  body: QuireMeasuredContainer,
  notes: Parameters<typeof appendQuireEndNotes>[0]["notes"],
  geometry: QuirePageGeometry = pageGeometry
) {
  const { fragments } = driveQuireMeasuredContainerPages({ container: body, pageGeometry: geometry, noteSeparatorHeight: 5 });
  return appendQuireEndNotes({ fragments, pageGeometry: geometry, notes, separatorHeight: 5, continuationSeparatorHeight: 4 });
}

describe("end notes after the flow", () => {
  it("returns the fragments unchanged without notes", () => {
    const { fragments } = driveQuireMeasuredContainerPages({ container: container(3), pageGeometry });
    expect(appendQuireEndNotes({ fragments, pageGeometry, notes: [], separatorHeight: 5, continuationSeparatorHeight: 4 }))
      .toBe(fragments);
  });

  it("starts right below the last body content on the same page", () => {
    const pages = layout(container(3), [{ id: "a", height: 12, lines: [6, 12] }, { id: "b", height: 6, lines: [6] }]);

    expect(pages).toHaveLength(1);
    expect(pages[0]?.endNoteAreas).toEqual([{
      rect: { x: 0, y: 40, width: 100, height: 23 },
      notes: [
        { id: "a", offset: 0, height: 12, continuation: false },
        { id: "b", offset: 0, height: 6, continuation: false }
      ],
      continuation: false
    }]);
  });

  it("continues line by line on an appended page with the continuation band", () => {
    const pages = layout(container(8), [{ id: "a", height: 30, lines: [10, 20, 30] }]);

    // 20px remain below the body: the 5px band and one 10px line fit.
    expect(pages).toHaveLength(2);
    expect(pages[0]?.endNoteAreas?.[0]).toMatchObject({ rect: { y: 90, height: 15 }, continuation: false,
      notes: [{ id: "a", offset: 0, height: 10, continuation: false }] });
    expect(pages[1]).toMatchObject({ pageIndex: 1, range: { from: 8, to: 8 }, pageRect: { y: 140 } });
    expect(pages[1]?.endNoteAreas).toEqual([{ rect: { x: 0, y: 150, width: 100, height: 24 },
      notes: [{ id: "a", offset: 10, height: 20, continuation: true }], continuation: true }]);
  });

  it("moves to the next page when not even one line fits below the body", () => {
    const pages = layout(container(10), [{ id: "a", height: 10, lines: [10] }]);

    expect(pages[0]?.endNoteAreas).toBeUndefined();
    expect(pages[1]?.endNoteAreas).toEqual([{ rect: { x: 0, y: 150, width: 100, height: 15 },
      notes: [{ id: "a", offset: 0, height: 10, continuation: false }], continuation: false }]);
  });

  it("stays above the page-bottom notes of the last page", () => {
    const pages = layout(container(3, { 0: { notes: [{ id: "f", height: 20 }] } }), [{ id: "a", height: 60, lines: [20, 40, 60] }]);

    // Body ends at 40, footnotes take 25px above 110: end notes get 40..85.
    expect(pages[0]?.endNoteAreas?.[0]).toMatchObject({ rect: { y: 40, height: 45 }, notes: [{ height: 40 }] });
    expect(pages[1]?.endNoteAreas?.[0]).toMatchObject({ notes: [{ offset: 40, height: 20, continuation: true }] });
  });

  it("fills the remaining columns of the last page before appending one", () => {
    const geometry: QuirePageGeometry = {
      ...pageGeometry,
      bodyRect: { ...pageGeometry.bodyRect, height: 30 },
      columns: { columns: [{ offset: 0, width: 45 }, { offset: 55, width: 45 }], separator: false, measureWidth: 45 }
    };
    const pages = layout(container(1), [{ id: "a", height: 30, lines: [10, 20, 30] }], geometry);

    expect(pages).toHaveLength(1);
    expect(pages[0]?.endNoteAreas?.map((area) => [area.rect.x, area.rect.y, area.notes[0]?.offset])).toEqual([
      [0, 20, 0],
      [55, 10, 10]
    ]);
  });
});
