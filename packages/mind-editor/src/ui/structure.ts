import { mindEditorTranslator } from "../locale/resolve";
import type { MindEditorTranslate, MindEditorMessageKey } from "../locale/types";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import type { MindMapEditorState } from "@quirekit/mind-map-simple";
import type { MindMapStructureCommand } from "@quirekit/mind-map";
import { mindEditorActionIcons } from "./icons";

/** Initial availability before a renderer has published a selection. */
export const emptyMindMapStructureState: MindMapEditorState["structure"] = {
  "add-parent": false, indent: false, outdent: false, "move-up": false, "move-down": false,
  "expand-selected": false, "collapse-selected": false, "expand-all": false, "collapse-all": false,
};
const labels: Record<MindMapStructureCommand, MindEditorMessageKey> = {
  "add-parent": "addParent", indent: "indent", outdent: "outdent", "move-up": "moveUp", "move-down": "moveDown",
  "expand-selected": "expandSelected", "collapse-selected": "collapseSelected", "expand-all": "expandAll", "collapse-all": "collapseAll",
};
const shortcuts: Partial<Record<MindMapStructureCommand, readonly string[]>> = {
  "add-parent": ["Shift", "Enter"], indent: ["Alt", "Shift", "→"], outdent: ["Shift", "Tab"],
  "move-up": ["Alt", "Shift", "↑"], "move-down": ["Alt", "Shift", "↓"],
};
/** @param value - Structural command. @param state - Small renderer state. @param ready - Mount availability. @param t - Scoped workspace translator. @returns One canonical menu action. */
export function mindEditorStructureItem(value: MindMapStructureCommand, state: MindMapEditorState, ready: boolean, t: MindEditorTranslate = mindEditorTranslator()): QuireKitMenuEntry {
  return { value, label: t(labels[value]), icon: mindEditorActionIcons[value], shortcut: shortcuts[value],
    disabled: !ready || state.busy || state.composing || state.readOnly || !state.structure[value] };
}
/** @param state - Small renderer state. @param ready - Mount availability. @param t - Scoped workspace translator. @returns Hierarchy and ordering actions. */
export function mindEditorHierarchyItems(state: MindMapEditorState, ready: boolean, t: MindEditorTranslate = mindEditorTranslator()): readonly QuireKitMenuEntry[] {
  return (["outdent", "indent", "move-up", "move-down"] as const).map(value => mindEditorStructureItem(value, state, ready, t));
}
/** @param state - Small renderer state. @param ready - Mount availability. @param t - Scoped workspace translator. @returns Explicit branch visibility actions. */
export function mindEditorBranchItems(state: MindMapEditorState, ready: boolean, t: MindEditorTranslate = mindEditorTranslator()): readonly QuireKitMenuEntry[] {
  return (["expand-selected", "collapse-selected", "expand-all", "collapse-all"] as const).map(value => mindEditorStructureItem(value, state, ready, t));
}
/** @param state - Selection and editing availability. @param ready - Mount availability. @param t - Scoped workspace translator. @returns Context menu matching Toolbar capabilities. */
export function mindEditorContextItems(state: MindMapEditorState, ready: boolean, t: MindEditorTranslate = mindEditorTranslator()): readonly QuireKitMenuEntry[] {
  const disabled = !ready || state.busy || state.composing || state.readOnly;
  const selected = disabled || state.selectedCount !== 1;
  return [
    { value: "add-child", label: t("addChild"), icon: mindEditorActionIcons["add-child"], shortcut: ["Tab"], disabled: selected },
    { value: "add-sibling", label: t("addSibling"), icon: mindEditorActionIcons["add-sibling"], shortcut: ["Enter"], disabled: selected || state.selectedIsRoot },
    mindEditorStructureItem("add-parent", state, ready, t),
    { value: "add-free", label: t("addFree"), icon: mindEditorActionIcons["add-free"], disabled },
    { value: "context-edit", kind: "separator", label: "" },
    { value: "edit-text", label: t("editText"), icon: mindEditorActionIcons["edit-text"], shortcut: ["F2"], disabled: selected },
    { value: "context-order", label: t("hierarchy"), icon: "indentIncrease", kind: "submenu", disabled: selected, children: mindEditorHierarchyItems(state, ready, t) },
    { value: "context-visibility", label: t("visibility"), icon: "chevronsUpDown", kind: "submenu", disabled, children: mindEditorBranchItems(state, ready, t) },
    { value: "context-delete", kind: "separator", label: "" },
    { value: "remove", label: t("remove"), icon: mindEditorActionIcons.remove, shortcut: ["Delete"], disabled: disabled || state.selectedCount === 0 || (state.selectedCount === 1 && state.selectedIsRoot) },
  ];
}
