import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import type { FlowColorIntent, FlowGeometryIntent, FlowShapeIntent, FlowTextIntent } from "./types";
/** @param editor - Current neutral owner. @param value - Public toolbar action. @param payload - Captured renderer intent. @returns Whether the action belongs to guarded formatting. */
export function applyFlowFormattingIntent(editor: FlowchartEditor, value: string, payload: unknown): boolean {
  if (value === "object") {
    const intent = payload as FlowShapeIntent | FlowGeometryIntent | undefined;
    value = intent?.kind === "shape" ? "replace-shape" : intent?.kind === "geometry" ? "geometry" : "";
  }
  if (value === "replace-shape") {
    const intent = payload as FlowShapeIntent | undefined;
    if (intent?.kind === "shape" && intent.editor === editor) editor.replaceShape(intent.shape, intent.expected);
  } else if (value === "geometry") {
    const intent = payload as FlowGeometryIntent | undefined;
    if (intent?.kind === "geometry" && intent.editor === editor) editor.setGeometry(intent.patch, intent.expected);
  } else if (["fill", "stroke", "color"].includes(value)) {
    const intent = payload as FlowColorIntent | undefined;
    if (intent?.kind === "color" && intent.editor === editor && intent.selection === JSON.stringify(editor.getState().selectedIds)) editor.setColor(intent.target, intent.color);
  } else if (value === "font") {
    const intent = payload as FlowTextIntent | undefined;
    if (intent?.kind === "typography" && intent.editor === editor && intent.selection === JSON.stringify(editor.getState().selectedIds)) editor.setNodeStyle(intent.style);
  } else return false;
  return true;
}
