import { canReplaceFlowchartShape } from "@quirekit/flowchart";
import type { FlowchartEditorState } from "@quirekit/flowchart-x6";

/** @param state - Lightweight selection and permission. @returns Whether the entire selection supports ordinary shape replacement. */
export function canReplaceShapes(state: FlowchartEditorState): boolean {
  return !state.readOnly && !state.composing && !state.selectionLocked && !!state.selectedShapes.length
    && state.selectedShapes.length === state.selectedIds.length && state.selectedShapes.every(canReplaceFlowchartShape);
}
