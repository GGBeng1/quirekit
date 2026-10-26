import type { Attrs } from "@quirekit/pm";
import { getMarkAttributes } from "../helpers";
import {
  canSetMark,
  resolveMarkType
} from "./mark-utils";
import type { QuireMarkTypeInput } from "./mark-types";
import type { Command } from "../types";

/**
 * Adds a mark to the selected ranges, or to stored marks when the selection is
 * collapsed.
 *
 * @param typeOrName - Mark type object or schema mark name.
 * @param attrs - Optional attributes for the created mark.
 * @returns Command that sets the requested mark.
 */
export function setMark(
  typeOrName: QuireMarkTypeInput,
  attrs: Attrs | null = null
): Command {
  return ({ state, tr, dispatch }) => {
    const markType = resolveMarkType(state, typeOrName);

    if (!markType) {
      return false;
    }

    const attributes = attrs ?? {};

    if (tr.selection.empty) {
      const oldAttributes = getMarkAttributes(state, markType);

      dispatch?.(
        tr.addStoredMark(markType.create({ ...oldAttributes, ...attributes })).scrollIntoView()
      );

      return canSetMark(state, tr, markType);
    }

    for (const range of tr.selection.ranges) {
      const from = range.$from.pos;
      const to = range.$to.pos;

      tr.doc.nodesBetween(from, to, (node, pos) => {
        const trimmedFrom = Math.max(pos, from);
        const trimmedTo = Math.min(pos + node.nodeSize, to);
        const currentMark = node.marks.find((mark) => mark.type === markType);

        if (currentMark) {
          tr.addMark(
            trimmedFrom,
            trimmedTo,
            markType.create({ ...currentMark.attrs, ...attributes })
          );
        } else {
          tr.addMark(trimmedFrom, trimmedTo, markType.create(attributes));
        }
      });
    }

    if (!canSetMark(state, tr, markType) || !state.filterTransaction(tr)) {
      tr.setMeta("preventDispatch", true);
      return false;
    }

    dispatch?.(tr.scrollIntoView());
    return true;
  };
}
