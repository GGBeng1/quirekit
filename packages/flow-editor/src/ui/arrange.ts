import type { QuireKitMenuEntry, QuireKitToolbarRow } from "@quirekit/ui";
import type { FlowchartEditorState } from "@quirekit/flowchart-x6";
import { canTransformFlowchartShape, isFlowchartContainer, isSequenceParticipant } from "@quirekit/flowchart";

/** @param state - Selection-only projection. @returns Direct alignment actions without reading graph geometry. */
export function flowAlignmentRows(state: FlowchartEditorState): readonly QuireKitToolbarRow[] {
  const shapes = state.selectedShapes, count = shapes.length;
  const structural = shapes.some(s => s.startsWith("lane-") || s.startsWith("phase-") || s === "activation" || s === "destruction");
  const pair = state.readOnly || state.composing || state.selectionLocked || count < 2 || structural, vertical = pair || shapes.some(isSequenceParticipant);
  const size = pair || shapes.some(s => isFlowchartContainer(s) || isSequenceParticipant(s));
  return [
    { value: "alignment", label: "对齐", items: [
      { value: "align-left", label: "左对齐", icon: "alignStartVertical", disabled: pair },
      { value: "align-center", label: "水平居中", icon: "alignCenterVertical", disabled: pair },
      { value: "align-right", label: "右对齐", icon: "alignEndVertical", disabled: pair },
      { value: "align-top", label: "顶端对齐", icon: "alignStartHorizontal", disabled: vertical },
      { value: "align-middle", label: "垂直居中", icon: "alignCenterHorizontal", disabled: vertical },
      { value: "align-bottom", label: "底端对齐", icon: "alignEndHorizontal", disabled: vertical },
    ] },
    { value: "distribution", label: "等距分布", items: [
      { value: "distribute-horizontal", label: "水平等距分布", text: "水平等距", icon: "tableDistributeColumns", disabled: pair || count < 3 },
      { value: "distribute-vertical", label: "垂直等距分布", text: "垂直等距", icon: "tableDistributeRows", disabled: vertical || count < 3 },
    ] },
    { value: "dimensions", label: "统一尺寸", items: [
      { value: "size-width", label: "等宽", text: "等宽", disabled: size },
      { value: "size-height", label: "等高", text: "等高", disabled: size },
      { value: "size-both", label: "相同尺寸", text: "相同尺寸", disabled: size },
    ] },
  ];
}

/** @param state - Selection-only projection. @returns Layering, transformation and object organization commands. */
export function flowArrangeItems(state: FlowchartEditorState): readonly QuireKitMenuEntry[] {
  const shapes = state.selectedShapes, count = shapes.length;
  const pair = state.selectionLocked || count < 2 || shapes.some(s => s.startsWith("lane-") || s.startsWith("phase-") || s === "activation" || s === "destruction");
  const none = !state.selectedIds.length, blocked = none || state.selectionLocked;
  return [
    { value: "layers", label: "层级", kind: "submenu", disabled: blocked, children: [
      { value: "layer-front", label: "置于顶层" }, { value: "layer-forward", label: "上移一层" },
      { value: "layer-backward", label: "下移一层" }, { value: "layer-back", label: "置于底层" },
    ] },
    { value: "transform", label: "旋转与翻转", kind: "submenu", disabled: blocked || !count || shapes.some(s => !canTransformFlowchartShape(s)), children: [
      { value: "rotate-left", label: "向左旋转 90°", icon: "rotateCcw" }, { value: "rotate-right", label: "向右旋转 90°", icon: "rotateCw" },
      { value: "flip-horizontal", label: "水平翻转", icon: "flipHorizontal" }, { value: "flip-vertical", label: "垂直翻转", icon: "flipVertical" },
      { value: "transform-reset", label: "重置旋转与翻转" },
    ] },
    { value: "objects", label: "对象", kind: "group", children: [
      { value: "group", label: "组合", disabled: pair || shapes.some(isSequenceParticipant) },
      { value: "ungroup", label: "取消组合", disabled: blocked || !shapes.includes("group") },
      { value: "lock", label: "锁定", disabled: none }, { value: "unlock", label: "解锁", disabled: none },
      { value: "unlock-all", label: "全部解锁" },
    ] },
    { value: "auto-layout", label: "自动布局", kind: "submenu", children: [
      { value: "layout-down", label: "从上到下", icon: "arrowDown" }, { value: "layout-right", label: "从左到右", icon: "arrowRight" },
    ] },
  ];
}
