import { getAttributes, getMarkRange, isMarkActive } from "@quirekit/core";
import type { EditorState } from "@quirekit/pm";
import { normalizeLinkHref } from "./href";
import type { LinkRange } from "./types";

/**
 * Resolves one active link without crossing a differently targeted neighbour.
 * @param state - Current or chainable transaction state.
 * @param name - Link mark name.
 * @returns Complete occurrence, or null for mixed/outside selections.
 */
export function getLinkRange(state: EditorState, name = "link"): LinkRange | null {
  const type = state.schema.marks[name];
  if (!type || !isMarkActive(state, type)) return null;
  const attrs = getAttributes(state, type);
  const href = normalizeLinkHref(attrs.href);
  const range = getMarkRange(state.selection.$from, type, attrs);
  if (!range || href === null || state.selection.to > range.to) return null;
  return { ...range, href };
}
