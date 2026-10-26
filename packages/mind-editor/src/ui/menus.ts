import { mindEditorTranslator } from "../locale/resolve";
import type { MindEditorTranslate } from "../locale/types";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import type { MindMapEditorState } from "@quirekit/mind-map-simple";
import { mindEditorActionIcons } from "./icons";
import { mindEditorBranchItems, mindEditorHierarchyItems, mindEditorStructureItem } from "./structure";

/** @param state - Current small selection state. @param ready - Mount availability. @param t - Scoped workspace translator. @returns Discoverable insert actions with truthful selection requirements. */
export function mindEditorInsertItems(state: MindMapEditorState, ready: boolean, t: MindEditorTranslate = mindEditorTranslator()): readonly QuireKitMenuEntry[] {
  const disabled = !ready || state.busy || state.composing || state.readOnly;
  const single = disabled || state.selectedCount !== 1, any = disabled || !state.selectedCount;
  const unavailableReason = !ready || state.busy ? t("processing") : state.composing ? t("finishInput") : state.readOnly ? t("readOnlyReason") : undefined;
  const singleReason = single ? unavailableReason ?? t("selectOne") : undefined;
  const anyReason = any ? unavailableReason ?? t("selectTopics") : undefined;
  return [
    mindEditorStructureItem("add-parent", state, ready, t),
    { value: "add-free", label: t("floatingTopic"), icon: mindEditorActionIcons["add-free"], disabled },
    { value: "insert-content", label: "", kind: "separator" },
    { value: "detail:image", label: t("imageMenu"), icon: "image", disabled: single, reason: singleReason },
    { value: "detail:link", label: t("linkMenu"), icon: "link", disabled: single, reason: singleReason },
    { value: "detail:note", label: t("noteMenu"), icon: "notebook", disabled: single, reason: singleReason },
    { value: "detail:marker", label: t("priorityMenu"), icon: "flag", disabled: any, reason: anyReason },
    { value: "insert-relations", label: "", kind: "separator" },
    { value: "annotation:relation", label: t("relationship"), icon: "spline", disabled: disabled || state.selectedCount !== 2,
      reason: disabled || state.selectedCount !== 2 ? unavailableReason ?? t("selectTwo") : undefined },
    { value: "annotation:summary", label: t("summary"), icon: "textQuote", disabled: any, reason: anyReason },
    { value: "annotation:boundary", label: t("boundary"), icon: "group", disabled: any, reason: anyReason },
  ];
}
/** @param state - Selection and history state. @param ready - Mount availability. @param t - Scoped workspace translator. @returns Text, hierarchy and existing object editing. */
export function mindEditorEditItems(state: MindMapEditorState, ready: boolean, t: MindEditorTranslate = mindEditorTranslator()): readonly QuireKitMenuEntry[] {
  const unavailable = !ready || state.busy || state.composing, disabled = unavailable || state.readOnly;
  return [
    { value: "edit-text", label: t("editText"), icon: "edit", shortcut: ["F2"], disabled: disabled || state.selectedCount !== 1 },
    { value: "edit-order", label: "", kind: "separator" },
    ...mindEditorHierarchyItems(state, ready, t),
    { value: "edit-properties", label: "", kind: "separator" },
    { value: "details", label: t("detailsMenu"), icon: "notebook", disabled: unavailable || !state.selectedCount },
    { value: "annotations", label: t("annotationsMenu"), icon: "group", disabled: unavailable },
    { value: "edit-delete", label: "", kind: "separator" },
    { value: "remove", label: t("remove"), icon: "trash", shortcut: ["Delete"], disabled: disabled || !state.selectedCount || (state.selectedCount === 1 && state.selectedIsRoot) },
  ];
}
/** @param state - Selection and permission state. @param ready - Mount availability. @param navigationOpen - Visible outline panel. @param t - Scoped workspace translator. @param overviewOpen - Visible navigation overview. @returns Viewing actions separated from layout mutations. */
export function mindEditorViewItems(state: MindMapEditorState, ready: boolean, navigationOpen: boolean, t: MindEditorTranslate = mindEditorTranslator(), overviewOpen = false): readonly QuireKitMenuEntry[] {
  const unavailable = !ready || state.busy || state.composing;
  return [
    { value: "find", label: t("find"), icon: "search", shortcut: ["Ctrl/⌘", "F"], checked: navigationOpen,
      closeOnSelect: true, disabled: unavailable },
    { value: "overview", label: t("overview"), icon: "network", checked: overviewOpen, closeOnSelect: true, disabled: unavailable },
    { value: "fit-selection", label: t("fitSelection"), icon: "scan", disabled: unavailable || !state.selectedCount },
    { value: "focus-branch", label: t("focusBranch"), icon: "listFilter", disabled: unavailable || state.readOnly || state.selectedCount !== 1,
      reason: state.readOnly ? t("readOnlyReason") : state.selectedCount !== 1 ? t("selectOne") : undefined },
    { value: "print", label: t("printMap"), icon: "printer", disabled: unavailable },
    { value: "view-branches", label: "", kind: "separator" },
    ...mindEditorBranchItems(state, ready, t),
  ];
}
