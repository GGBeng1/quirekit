import { flowFormatReuseItems } from "./format-reuse";
import { canReplaceShapes } from "./replacement";
import { canQuickCreate, flowQuickCreateItems } from "./connected";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import type { FlowchartEditorState } from "@quirekit/flowchart-x6";
import { flowArrangeItems } from "./arrange";

/** @param state - Current selection and permission. @returns Context actions sharing the toolbar's canonical command identities. */
export function flowContextItems(state: FlowchartEditorState): readonly QuireKitMenuEntry[] {
  const none = !state.selectedIds.length, disabled = state.readOnly || state.composing, selected = disabled || none || state.selectionLocked;
  const arrangement = flowArrangeItems(state), objects = arrangement.find(item => item.value === "objects");
  return [
    { value: state.selectedShapes[0] === "image" ? "media-edit" : "edit-text", label: state.selectedShapes[0] === "image" ? "编辑图片" : "编辑文字", icon: state.selectedShapes[0] === "image" ? "image" : "textCursorInput", shortcut: "F2", disabled: selected },
    { value: "open-replace-shape", label: "更换图形", icon: "hexagon", disabled: !canReplaceShapes(state) },
    { value: "open-geometry", label: "位置与尺寸", icon: "ruler", disabled: selected || !state.selectedShapes.length },
    { value: "quick-create", label: "添加相连图形", icon: "workflow", kind: "submenu", disabled: !canQuickCreate(state), children: flowQuickCreateItems() },
    { value: "clipboard-copy", label: "复制选区", icon: "clipboardCopy", shortcut: "Ctrl/⌘ C", disabled: none || state.composing },
    { value: "clipboard-cut", label: "剪切选区", icon: "scissors", shortcut: "Ctrl/⌘ X", disabled: selected },
    { value: "clipboard-paste", label: "粘贴图形", icon: "clipboardPaste", shortcut: "Ctrl/⌘ V", disabled },
    { value: "duplicate", label: "复制图形", icon: "copy", shortcut: "Ctrl/⌘ D", disabled: selected || !state.selectedShapes.length },
    ...flowFormatReuseItems(state),
    { value: "sep-objects", label: "", kind: "separator" },
    ...(objects?.children ?? []).filter(item => ["group", "ungroup"].includes(item.value)).map(item => ({ ...item, icon: item.value, shortcut: item.value === "group" ? "Ctrl/⌘ G" : "Ctrl/⌘ Shift G", disabled: disabled || item.disabled })),
    { value: state.selectionLocked ? "unlock" : "lock", label: state.selectionLocked ? "解锁" : "锁定", icon: state.selectionLocked ? "lockOpen" : "lock", disabled: disabled || none },
    ...arrangement.filter(item => item.value === "layers").map(item => ({ ...item, icon: "layers", disabled: selected })),
    { value: "sep-canvas", label: "", kind: "separator" },
    { value: "select-all", label: "全选", shortcut: "Ctrl/⌘ A", disabled: state.composing },
    { value: "fit", label: "适应画布", icon: "maximize", disabled: state.composing },
    { value: "fit-selection", label: "适应选区", icon: "scan", disabled: state.composing || none },
    { value: "delete", label: "删除", icon: "trash", shortcut: "Delete", disabled: selected },
  ];
}
