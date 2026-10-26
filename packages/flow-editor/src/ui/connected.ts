import type { QuireKitMenuEntry } from "@quirekit/ui";
import { canReplaceFlowchartShape } from "@quirekit/flowchart";
import type { FlowchartEditorState } from "@quirekit/flowchart-x6";

/** @param state - Small selection projection. @returns Whether one ordinary unlocked node can create a connected neighbor. */
export function canQuickCreate(state: FlowchartEditorState): boolean {
  return !state.readOnly && !state.composing && !state.selectionLocked && state.selectedIds.length === 1 && state.selectedShapes.length === 1 && canReplaceFlowchartShape(state.selectedShapes[0]!);
}
/** @returns Directions and ordinary shape choices with meaningful public icons. */
export function flowQuickCreateItems(): readonly QuireKitMenuEntry[] {
  const shapes = [["same", "相同图形", "copy"], ["process", "处理", "rectangleHorizontal"], ["decision", "判断", "diamond"], ["terminal", "开始 / 结束", "circle"], ["note", "便笺", "file"], ["database", "数据库", "database"]] as const;
  return [["right", "向右添加", "arrowRight"], ["down", "向下添加", "arrowDown"], ["left", "向左添加", "arrowLeft"], ["up", "向上添加", "arrowUp"]].map(([direction, label, icon]) => ({
    value: `quick-${direction}`, label: label!, icon: icon!, kind: "submenu", children: shapes.map(([shape, name, symbol]) => ({ value: `quick-${direction}-${shape}`, label: name, icon: symbol })),
  }));
}
