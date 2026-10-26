import { describe, expect, it } from "vitest";
import { TABLE_SCROLL_ATTRIBUTE, scrolledTableRow, tableScroller } from "./scroll";

/**
 * @param options - Minimal element shape read by the scroll helpers.
 * @returns A stand-in element without a DOM environment.
 */
function element(options: { row?: boolean; wrapper?: boolean; parent?: HTMLElement; child?: HTMLElement }): HTMLElement {
  return {
    classList: { contains: (name: string) => name === "msfe-table-row" && !!options.row },
    hasAttribute: (name: string) => name === TABLE_SCROLL_ATTRIBUTE && !!options.wrapper,
    parentElement: options.parent ?? null,
    querySelector: () => options.child ?? null,
  } as unknown as HTMLElement;
}

describe("table scroll owner", () => {
  it("uses the host table wrapper when present, otherwise the row", () => {
    const wrapper = element({ wrapper: true });
    expect(tableScroller(element({ row: true, parent: wrapper }))).toBe(wrapper);
    const row = element({ row: true, parent: element({}) });
    expect(tableScroller(row)).toBe(row);
  });

  it("resolves the table row from a scrolled row or wrapper", () => {
    const row = element({ row: true });
    expect(scrolledTableRow(row)).toBe(row);
    expect(scrolledTableRow(element({ wrapper: true, child: row }))).toBe(row);
    expect(scrolledTableRow(element({}))).toBeNull();
    expect(scrolledTableRow(null)).toBeNull();
  });
});
