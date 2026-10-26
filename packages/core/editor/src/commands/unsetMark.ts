import { getMarkRange } from "../helpers";
import { resolveMarkType } from "./mark-utils";
import type {
  QuireMarkTypeInput,
  QuireUnsetMarkOptions
} from "./mark-types";
import type { Command } from "../types";

/**
 * Removes a mark from the selected ranges, or from stored marks when the
 * selection is collapsed.
 *
 * @param typeOrName - Mark type object or schema mark name.
 * @param options - Optional removal behavior.
 * @returns Command that unsets the requested mark.
 */
export function unsetMark(
  typeOrName: QuireMarkTypeInput,
  options: QuireUnsetMarkOptions = {}
): Command {
  return ({ state, tr, dispatch }) => {
    const markType = resolveMarkType(state, typeOrName);

    if (!markType) {
      return false;
    }

    const { extendEmptyMarkRange = false } = options;
    const { selection } = tr;

    if (selection.empty && extendEmptyMarkRange) {
      let { from, to } = selection;
      const attrs = selection.$from.marks().find((mark) => mark.type === markType)?.attrs;
      const range = getMarkRange(selection.$from, markType, attrs);

      if (range) {
        from = range.from;
        to = range.to;
      }

      tr.removeMark(from, to, markType);
    } else {
      for (const range of selection.ranges) {
        tr.removeMark(range.$from.pos, range.$to.pos, markType);
      }
    }

    tr.removeStoredMark(markType);
    if (!state.filterTransaction(tr)) {
      tr.setMeta("preventDispatch", true);
      return false;
    }
    dispatch?.(tr.scrollIntoView());

    return true;
  };
}
