import { describe, expect, it } from "vitest";
import { paginateQuireMeasuredContainer } from "./paginate";
import type { QuireMeasuredContainer, QuireMeasuredContainerItem } from "./types";

/**
 * Builds a 10px item with an optional group.
 *
 * @param id - Item id, also used as its range start.
 * @param group - Optional group id.
 * @returns Measured container item.
 */
function item(id: number, group?: string): QuireMeasuredContainerItem {
  return {
    id: `i${id}`,
    range: { from: id, to: id + 1 },
    height: 10,
    canSplit: false,
    ...(group === undefined ? {} : { group })
  };
}

/**
 * Wraps items in a measured container.
 *
 * @param items - Items in order.
 * @returns Measured container.
 */
function container(items: readonly QuireMeasuredContainerItem[]): QuireMeasuredContainer {
  return { id: "c", range: { from: 0, to: items.length }, items };
}

const base = { startIndex: 0, isPageTop: true, incomingEndInfo: { openMarks: [], openNodes: [] } };

describe("paginateQuireMeasuredContainer widow/orphan control", () => {
  it("pushes a whole paragraph down when too few lines fit at the page bottom (orphan)", () => {
    // block A, then paragraph G (g1,g2,g3). A 25px page fits A + g1 only — a 1-line
    // orphan of G. With orphans:2 the whole paragraph moves to the next page.
    const result = paginateQuireMeasuredContainer({
      ...base,
      container: container([item(0), item(1, "G"), item(2, "G"), item(3, "G")]),
      availableHeight: 25,
      widows: 2,
      orphans: 2
    });

    expect(result.kind).toBe("spill");
    expect(result.kind === "spill" && result.nextIndex).toBe(1); // resume at g1
    expect(result.kind === "spill" && result.range).toEqual({ from: 0, to: 1 }); // page has A only
  });

  it("pushes a line down when too few lines reach the next page top (widow)", () => {
    // paragraph G (g1..g4), then block. A 35px page fits g1,g2,g3 — a 1-line widow.
    // With widows:2 a line is pushed down so the next page gets g3,g4.
    const result = paginateQuireMeasuredContainer({
      ...base,
      container: container([item(0, "G"), item(1, "G"), item(2, "G"), item(3, "G"), item(4)]),
      availableHeight: 35,
      widows: 2,
      orphans: 2
    });

    expect(result.kind === "spill" && result.nextIndex).toBe(2); // resume at g3
    expect(result.kind === "spill" && result.consumedHeight).toBe(20); // g1 + g2
  });

  it("keeps the natural break when widows and orphans cannot both be satisfied", () => {
    // A 3-line paragraph split 2/1 cannot give both sides 2 lines; leave it as is.
    const result = paginateQuireMeasuredContainer({
      ...base,
      container: container([item(0, "G"), item(1, "G"), item(2, "G")]),
      availableHeight: 25,
      widows: 2,
      orphans: 2
    });

    expect(result.kind === "spill" && result.nextIndex).toBe(2);
  });

  it("does nothing by default (widows and orphans of 1)", () => {
    const result = paginateQuireMeasuredContainer({
      ...base,
      container: container([item(0), item(1, "G"), item(2, "G"), item(3, "G")]),
      availableHeight: 25
    });

    expect(result.kind === "spill" && result.nextIndex).toBe(2); // natural break, no control
  });

  it("uses a paragraph-local widow and orphan policy instead of the document default", () => {
    const grouped = [
      item(0),
      { ...item(1, "G"), groupWidows: 2, groupOrphans: 2 },
      { ...item(2, "G"), groupWidows: 2, groupOrphans: 2 },
      { ...item(3, "G"), groupWidows: 2, groupOrphans: 2 }
    ];
    const result = paginateQuireMeasuredContainer({
      ...base,
      container: container(grouped),
      availableHeight: 25,
      widows: 1,
      orphans: 1
    });

    expect(result.kind === "spill" && result.nextIndex).toBe(1);
  });

  it("lets an explicit disabled paragraph policy override enabled document defaults", () => {
    const grouped = [
      item(0),
      { ...item(1, "G"), groupWidows: 1, groupOrphans: 1 },
      { ...item(2, "G"), groupWidows: 1, groupOrphans: 1 },
      { ...item(3, "G"), groupWidows: 1, groupOrphans: 1 }
    ];
    const result = paginateQuireMeasuredContainer({
      ...base,
      container: container(grouped),
      availableHeight: 25,
      widows: 2,
      orphans: 2
    });

    expect(result.kind === "spill" && result.nextIndex).toBe(2);
  });
});
