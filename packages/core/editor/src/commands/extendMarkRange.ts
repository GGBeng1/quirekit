import { TextSelection } from "@quirekit/pm";
import { getMarkRange } from "../helpers";
import { resolveMarkType } from "./mark-utils";
import type { QuireMarkTypeInput } from "./mark-types";
import type { Command } from "../types";

/**
 * Extends the current selection to the contiguous range covered by a mark.
 *
 * @param typeOrName - Mark type object or schema mark name.
 * @param attributes - Optional mark attributes to match.
 * @returns Command that expands the current selection when a range exists.
 */
export function extendMarkRange(
  typeOrName: QuireMarkTypeInput,
  attributes: Readonly<Record<string, unknown>> = {}
): Command {
  return ({ state, tr, dispatch }) => {
    const markType = resolveMarkType(state, typeOrName);

    if (!markType) {
      return false;
    }

    const { selection } = tr;
    const range = dispatch
      ? getMarkRange(selection.$from, markType, attributes)
      : undefined;

    if (range && range.from <= selection.from && range.to >= selection.to) {
      tr.setSelection(TextSelection.create(tr.doc, range.from, range.to));
    }

    return true;
  };
}
