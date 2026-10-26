import type { MeasuredTable, TableScrollCorrection } from "./types";

/**
 * Host contract: a block wrapper around exactly one table's rows carries this attribute
 * to own the table's horizontal scrolling, so all rows move and overscroll as one box.
 * Without such a wrapper every native row scrolls locally and offsets are synchronized.
 */
export const TABLE_SCROLL_ATTRIBUTE = "data-msfe-table-scroll";

/** @param row - Mounted native table row. @returns The element whose `scrollLeft` positions this row. */
export function tableScroller(row: HTMLElement): HTMLElement {
  const parent = row.parentElement;
  return parent?.hasAttribute(TABLE_SCROLL_ATTRIBUTE) ? parent : row;
}

/**
 * Reads each physical owner before column-width writes can invalidate its layout.
 * @param tables - Currently mounted rows and accepted widths.
 * @param offsets - Retained horizontal positions keyed by canonical table start.
 * @returns Necessary corrections, with no duplicate owners or deferred geometry reads.
 */
export function readTableScroll(tables: readonly MeasuredTable[], offsets: ReadonlyMap<string, number>): readonly TableScrollCorrection[] {
  const seen = new Set<HTMLElement>(), corrections: TableScrollCorrection[] = [];
  for (const table of tables) for (const row of table.rows) {
    const element = tableScroller(row);
    if (seen.has(element)) continue;
    seen.add(element);
    const left = offsets.get(table.key) ?? 0;
    if (Math.abs(element.scrollLeft - left) > .5) corrections.push({ element, left });
  }
  return corrections;
}

/** @param target - Native scroll event target. @returns The table row identifying the scrolled table, if any. */
export function scrolledTableRow(target: EventTarget | null): HTMLElement | null {
  // Owner documents may belong to another realm, so test the element shape rather than its class.
  if (!target || !("classList" in target)) return null;
  if ((target as HTMLElement).classList.contains("msfe-table-row")) return target as HTMLElement;
  const element = target as HTMLElement;
  return element.hasAttribute(TABLE_SCROLL_ATTRIBUTE) ? element.querySelector<HTMLElement>(":scope > .msfe-table-row") : null;
}
