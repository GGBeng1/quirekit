import { mindEditorTranslator } from "../locale/resolve";
import type { MindEditorTranslate } from "../locale/types";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { MindMapEditorState } from "@quirekit/mind-map-simple";
import { mindEditorActionIcons } from "./icons";
import { mindEditorEditItems, mindEditorInsertItems, mindEditorViewItems } from "./menus";

/** @param state - Relevant selection/history state. @param ready - Mount availability. @param panel - Visible workspace panel. @param t - Scoped workspace translator. @param overviewOpen - Visible navigation overview. @returns Stable task groups using the shared Toolbar. */
export function mindEditorToolbar(state: MindMapEditorState, ready: boolean, panel: string | null = null, t: MindEditorTranslate = mindEditorTranslator(), overviewOpen = false): readonly QuireKitToolbarEntry[] {
  const unavailable = !ready || state.busy || state.composing, disabled = unavailable || state.readOnly;
  const selected = disabled || state.selectedCount !== 1;
  const unavailableReason = !ready || state.busy ? t("processing") : state.composing ? t("finishInput") : state.readOnly ? t("readOnlyReason") : undefined;
  const layouts = { "mind-map": t("mindMap"), "logical-right": t("logicalRight"), "logical-left": t("logicalLeft"), organization: t("organization"), timeline: t("timeline") } as const;
  const overlayProps = { width: "280px" };
  return [
    { value: "files", label: t("files"), text: t("files"), icon: "folderOpen", kind: "toggle", pressed: panel === "files", disabled },
    { value: "files-separator", label: "", kind: "separator" },
    { value: "history", label: t("history"), kind: "group", children: [
      { value: "undo", label: t("undo"), icon: "undo", disabled: disabled || !state.canUndo, tooltip: t("undoHint") },
      { value: "redo", label: t("redo"), icon: "redo", disabled: disabled || !state.canRedo, tooltip: t("redoHint") },
    ] },
    { value: "history-separator", label: "", kind: "separator" },
    { value: "add-child", label: t("addChild"), text: t("child"), icon: mindEditorActionIcons["add-child"], disabled: selected, tooltip: t("addChildHint"),
      ...(selected ? { disabledReason: unavailableReason ?? t("selectOne") } : {}) },
    { value: "add-sibling", label: t("addSibling"), text: t("sibling"), icon: mindEditorActionIcons["add-sibling"], disabled: selected || state.selectedIsRoot,
      tooltip: t("addSiblingHint"), ...(selected || state.selectedIsRoot ? { disabledReason: unavailableReason ?? (state.selectedIsRoot ? t("rootNoSibling") : t("selectOne")) } : {}) },
    { value: "insert", label: t("insert"), text: t("insert"), icon: "plus", kind: "menu", trigger: "disclosure", disabled, overlayProps, items: mindEditorInsertItems(state, ready, t) },
    { value: "edit-separator", label: "", kind: "separator" },
    { value: "edit", label: t("edit"), text: t("edit"), icon: "edit", kind: "menu", trigger: "disclosure", disabled: unavailable, overlayProps, items: mindEditorEditItems(state, ready, t) },
    { value: "format", label: t("formatTopic"), text: t("format"), icon: "slidersHorizontal", kind: "toggle", pressed: panel === "format", disabled: unavailable, tooltip: t("formatHint") },
    { value: "view-separator", label: "", kind: "separator" },
    { value: "layout", label: t("layout"), text: t("layout"), icon: "layoutGrid", kind: "menu", trigger: "disclosure", disabled,
      tooltip: t("layoutHint", { layout: layouts[state.layout] }), overlayProps, items: [
        { value: "layout-options", label: "", kind: "radio-group", selectedValue: `layout:${state.layout}`,
          children: Object.entries(layouts).map(([value, label]) => ({ value: `layout:${value}`, label, closeOnSelect: true })) },
      ] },
    { value: "view", label: t("view"), text: t("view"), icon: "eye", kind: "menu", trigger: "disclosure", disabled: unavailable, overlayProps,
      items: mindEditorViewItems(state, ready, panel === "find", t, overviewOpen) },
    { value: "export-separator", label: "", kind: "separator" },
    { value: "export", label: t("export"), text: t("export"), icon: "download", kind: "menu", trigger: "disclosure", disabled: unavailable, items: [
      { value: "export-pdf", label: t("exportPdf"), icon: "fileText" },
      { value: "export-png", label: t("exportPng"), icon: "image" },
      { value: "export-svg", label: t("exportSvg"), icon: "fileImage" },
      { value: "export-json", label: t("exportJson"), icon: "fileCode" },
      { value: "export-xmind", label: t("exportXmind"), icon: "fileArchive" },
      { value: "export-markdown", label: t("exportMarkdown"), icon: "fileCode" },
      { value: "export-outline", label: t("exportOutline"), icon: "listTree" },
    ] },
  ];
}

/** @param state - Viewport state. @param ready - Mount availability. @param t - Scoped workspace translator. @returns Navigation Toolbar entries. */
export function mindEditorViewportToolbar(state: MindMapEditorState, ready: boolean, t: MindEditorTranslate = mindEditorTranslator()): readonly QuireKitToolbarEntry[] {
  const disabled = !ready || state.busy || state.composing;
  return [
    { value: "zoom-out", label: t("zoomOut"), icon: "zoomOut", disabled: disabled || state.scale <= 0.1 },
    { value: "zoom-reset", label: t("zoomReset"), text: `${Math.round(state.scale * 100)}%`, disabled },
    { value: "zoom-in", label: t("zoomIn"), icon: "zoomIn", disabled: disabled || state.scale >= 3 },
    { value: "zoom-separator", label: "", kind: "separator" },
    { value: "center", label: t("center"), icon: "scan", disabled },
    { value: "fit", label: t("fit"), text: t("fit"), icon: "maximize", disabled },
  ];
}
