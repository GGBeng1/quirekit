import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { FlowchartEditorState } from "@quirekit/flowchart-x6";
import { flowFormatReuseItems } from "../format-reuse";
import { flowStructureItems } from "../structure";
import { flowArrangeItems } from "../arrange";
import { flowFileItems } from "./files";

/** @param state - Small selection/history state. @param ready - Mount availability. @returns Stable task groups without graph reads or selection-driven button movement. */
export function flowEditorToolbar(state: FlowchartEditorState, ready: boolean): readonly QuireKitToolbarEntry[] {
  const disabled = !ready || state.readOnly || state.composing || state.presenting, selected = disabled || state.selectionLocked || !state.selectedIds.length;
  const onlyImages = !!state.selectedShapes.length && state.selectedShapes.every(shape => shape === "image");
  return [
    { value: "files", label: "图表", text: "图表", icon: "folderOpen", kind: "menu", trigger: "disclosure", attributes: { "data-flow-file-actions": "true" }, disabled: !ready || state.composing, items: flowFileItems(state) },
    { value: "sep-files", label: "", kind: "separator" },
    { value: "undo", label: "撤销", icon: "undo", disabled: disabled || !state.canUndo, tooltip: "撤销 · Ctrl/⌘ Z" },
    { value: "redo", label: "重做", icon: "redo", disabled: disabled || !state.canRedo, tooltip: "重做 · Ctrl/⌘ Shift Z" },
    { value: "structure", label: "插入与结构", text: "插入", icon: "network", kind: "menu", trigger: "disclosure", disabled, items: flowStructureItems(state) },
    { value: "sep-history", label: "", kind: "separator" },
    { value: "format-painter", label: "格式刷", icon: "formatPainter", kind: "split", actionLabel: state.paintingFormat ? "取消格式刷" : "格式刷", disclosureLabel: "格式复用", pressed: state.paintingFormat,
      disabled: !ready || state.composing || state.presenting, actionDisabled: disabled || (!state.paintingFormat && state.selectedIds.length !== 1), items: flowFormatReuseItems(state), tooltip: "选择来源后启用，点击同类型目标 · Escape 取消" },
    { value: "drawing", label: "绘制风格", text: "风格", icon: "edit", kind: "menu", trigger: "disclosure", disabled: disabled || onlyImages,
      tooltip: state.selectedIds.length ? "应用到选中对象" : "应用到整张流程图",
      items: [{ value: "drawing-standard", label: "标准 · 清晰线条" }, { value: "drawing-sketch", label: "轻手绘 · 自然笔触" }, { value: "drawing-pencil", label: "铅笔 · 手绘排线" }] },
    { value: "fill", label: "填充颜色", icon: "fillColor", kind: "custom", renderer: "color", disabled: disabled || onlyImages || state.selectionLocked || !state.selectedStyle.nodeCount },
    { value: "stroke", label: "描边颜色", icon: "outlineColor", kind: "custom", renderer: "color", disabled: selected || onlyImages },
    { value: "color", label: "文字颜色", icon: "textColor", kind: "custom", renderer: "color", disabled: disabled || onlyImages || state.selectionLocked || !state.selectedStyle.nodeCount },
    { value: "font", label: "文字样式", text: "文字", icon: "type", kind: "disclosure", indicator: true, contentRenderer: "typography",
      disabled: selected || state.selectedKind !== "node" || state.selectedShapes.every(shape => shape === "group" || shape === "image") },
    { value: "sep-objects", label: "", kind: "separator" },
    { value: "object", label: "图形属性", text: "图形", icon: "hexagon", kind: "disclosure", indicator: true, contentRenderer: "object", disabled: selected || !state.selectedShapes.length },
    { value: "line", label: "连线设置", text: "连线", icon: "spline", kind: "custom", renderer: "style", disabled: selected || !state.selectedStyle.edgeCount },
    { value: "alignment", label: "对齐与尺寸", text: "对齐", icon: "alignStartVertical", kind: "disclosure", indicator: true, contentRenderer: "alignment", disabled: selected || state.selectedShapes.length < 2 },
    { value: "arrange", label: "排列图形", text: "排列", icon: "layers", kind: "menu", trigger: "disclosure", disabled, items: flowArrangeItems(state) },
  ];
}
/** @param state - Viewport projection. @param ready - Mount availability. @returns Compact viewport controls. */
export function flowViewportToolbar(state: FlowchartEditorState, ready: boolean): readonly QuireKitToolbarEntry[] {
  const disabled = !ready || state.composing;
  return [
    { value: "zoom-out", label: "缩小", icon: "zoomOut", disabled: disabled || state.scale <= 0.1 },
    { value: "zoom-reset", label: "恢复 100%", text: `${Math.round(state.scale * 100)}%`, disabled },
    { value: "zoom-in", label: "放大", icon: "zoomIn", disabled: disabled || state.scale >= 3 },
    { value: "sep-zoom", label: "", kind: "separator" },
    { value: "fit", label: "适应画布", text: "适应画布", icon: "maximize", disabled },
    { value: "fit-selection", label: "适应选区", icon: "scan", disabled: disabled || !state.selectedIds.length },
    { value: "view-search", label: "查找图形", icon: "textSearch", disabled },
    { value: "view-overview", label: "画布缩略图", icon: "panelBottom", disabled },
  ];
}
