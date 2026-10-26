import type { QuirePageFragment } from "@quirekit/layout/pagination";
import type { QuireLayoutBox } from "../../../types";
import {
  hasQuireRepeatedTableHeaderState,
  readQuireRepeatedTableHeaderState
} from "../../repeated-table-headers";
import { isQuireLayoutContainer } from "../guards";

/**
 * Resolves the repeated table header height reserved before this page body.
 *
 * @param boxes - Layout boxes whose table ids may own the repeated header state.
 * @param page - Page fragment carrying continuation state.
 * @returns Repeated header height in CSS pixels, or 0 when none applies.
 */
export function resolveQuirePageRepeatedHeaderHeight(
  boxes: readonly QuireLayoutBox[],
  page: QuirePageFragment
): number {
  if (!hasQuireRepeatedTableHeaderState(page.endInfo)) {
    return 0;
  }

  for (const box of boxes) {
    const height = resolveQuirePageRepeatedHeaderHeightInBox(box, page);

    if (height !== null) {
      return height;
    }
  }

  return 0;
}

/**
 * Resolves repeated header height within one layout subtree.
 *
 * @param box - Layout box subtree to inspect.
 * @param page - Page fragment carrying continuation state.
 * @returns Header height for this subtree, or null when not owned here.
 */
function resolveQuirePageRepeatedHeaderHeightInBox(
  box: QuireLayoutBox,
  page: QuirePageFragment
): number | null {
  if (box.table !== undefined) {
    const repeatedHeader = readQuireRepeatedTableHeaderState(
      page.endInfo,
      box.table.tableId
    );

    if (repeatedHeader !== null) {
      return repeatedHeader.height;
    }
  }

  if (!isQuireLayoutContainer(box)) {
    return null;
  }

  for (const child of box.children) {
    const height = resolveQuirePageRepeatedHeaderHeightInBox(child, page);

    if (height !== null) {
      return height;
    }
  }

  return null;
}
