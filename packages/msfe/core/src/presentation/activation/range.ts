import { Facet, type EditorSelection, type EditorState } from "@quirekit/cm-state";
import { modeFacet } from "../../state/fields";
import type { MsfeSourceRange } from "../../views/types";
import { sourceRevealSelection } from "../gesture";
import { sourceRevealSetting } from "../visibility";
import type { SourceRevealResolver } from "./types";

/** Optional host policy shared by projections, component views and measured geometry. */
export const sourceRevealResolver = Facet.define<SourceRevealResolver, SourceRevealResolver | undefined>({
  combine: values => values[0],
});

/**
 * Tests all directed selections, including carets on syntax boundaries.
 * @param selection - Gesture-stable source selection.
 * @param from - Inclusive source start.
 * @param to - Source end, also included for a collapsed caret.
 * @returns Whether the selection intersects the supplied source range.
 */
export function isSourceActive(selection: EditorSelection, from: number, to: number): boolean {
  return selection.ranges.some(range => range.empty
    ? range.from >= from && range.from <= to
    : range.from < to && range.to > from);
}

/**
 * Resolves presentation ownership without changing canonical selection or input.
 * @param state - Current source and presentation configuration.
 * @param range - Fragment whose source may be revealed.
 * @returns Whether its owner is selected in editable, syntax-revealing presentation.
 */
export function isSourceRevealed(state: EditorState, range: MsfeSourceRange): boolean {
  if (state.facet(modeFacet) !== "live" || sourceRevealSetting.read(state) === "hidden") return false;
  const owner = state.facet(sourceRevealResolver)?.(state, range) ?? range;
  if (!Number.isInteger(owner.from) || !Number.isInteger(owner.to) || owner.from < 0
    || owner.from > range.from || owner.to < range.to || owner.to > state.doc.length) {
    throw new RangeError("invalid-source-reveal-owner");
  }
  return isSourceActive(sourceRevealSelection(state), owner.from, owner.to);
}
