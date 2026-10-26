import type { Attrs } from "@quirekit/pm";
import { isMarkActive } from "../helpers";
import { resolveMarkType } from "./mark-utils";
import { setMark } from "./setMark";
import { unsetMark } from "./unsetMark";
import type {
  QuireMarkTypeInput,
  QuireToggleMarkOptions
} from "./mark-types";
import type { Command } from "../types";

/**
 * Toggles a mark on the selected ranges, or in stored marks when the selection
 * is collapsed.
 *
 * @param typeOrName - Mark type object or schema mark name.
 * @param attrs - Optional attributes for the created mark.
 * @param options - Optional toggle behavior.
 * @returns Command that toggles the requested mark.
 */
export function toggleMark(
  typeOrName: QuireMarkTypeInput,
  attrs: Attrs | null = null,
  options: QuireToggleMarkOptions = {}
): Command {
  return (context) => {
    const markType = resolveMarkType(context.state, typeOrName);

    if (!markType) {
      return false;
    }

    return isMarkActive(context.state, markType, attrs ?? {})
      ? unsetMark(markType, { extendEmptyMarkRange: options.extendEmptyMarkRange })(context)
      : setMark(markType, attrs)(context);
  };
}
