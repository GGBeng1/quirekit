import type { Command } from "../types";

/**
 * Removes every mark from the current non-empty selection.
 *
 * @returns Command that clears all marks in the current selection.
 */
export function unsetAllMarks(): Command {
  return ({ tr, dispatch }) => {
    if (tr.selection.empty) {
      return true;
    }

    for (const range of tr.selection.ranges) {
      tr.removeMark(range.$from.pos, range.$to.pos);
    }

    dispatch?.(tr.scrollIntoView());

    return true;
  };
}
