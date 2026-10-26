import type { EditorState } from "@quirekit/cm-state";
import { compositionField, modeFacet } from "../state/fields";
import { revealSelectionField, sourceRevealSelection } from "./gesture";
import type { SourcePresentation } from "./types";
import { sourceRevealSetting } from "./visibility";

/** @param state - Accepted source state. @returns Shared reveal timing for trusted renderer extensions. */
export function readSourcePresentation(state: EditorState): SourcePresentation {
  return { mode: state.facet(modeFacet), reveal: sourceRevealSetting.read(state) ?? "selection", selection: sourceRevealSelection(state),
    composing: state.field(compositionField, false) ?? false, selecting: !!state.field(revealSelectionField, false) };
}
