import { expect, it } from "vitest";
import type { MindMapEditorState } from "@quirekit/mind-map-simple";
import { mindEditorToolbar } from "./toolbar";
import { quireIconRegistry, type QuireKitMenuEntry, type QuireKitToolbarEntry } from "@quirekit/ui";
import { emptyMindMapStructureState, mindEditorContextItems } from "./structure";
const state: MindMapEditorState = { rootText: "中心主题", selectedId: "root", selectedIsRoot: true, selectedCount: 1, selectionVersion: 0, composing: false,
  layout: "mind-map", busy: false, structure: emptyMindMapStructureState,
  readOnly: false, canUndo: false, canRedo: false, scale: 1, x: 0, y: 0 };
/** @param entries - Toolbar or menu data. @returns Every reachable control. */
function flatten(entries: readonly (QuireKitToolbarEntry | QuireKitMenuEntry)[]): (QuireKitToolbarEntry | QuireKitMenuEntry)[] {
  return entries.flatMap(entry => [entry, ...flatten(entry.children ?? []), ...flatten("items" in entry ? entry.items ?? [] : [])]);
}
/** @param value - Stable intent. @param current - Small state projection. @returns Reachable command. */
function command(value: string, current = state) { return flatten(mindEditorToolbar(current, true)).find(item => item.value === value); }

it("keeps all admitted tasks reachable with registered semantic glyphs", () => {
  const items = flatten(mindEditorToolbar(state, true));
  expect(items.filter(item => item.icon && !quireIconRegistry.has(item.icon))).toEqual([]);
  for (const value of ["add-child", "add-sibling", "add-free", "add-parent", "edit-text", "remove", "indent", "outdent",
    "move-up", "move-down", "expand-selected", "collapse-selected", "expand-all", "collapse-all", "find", "format",
    "detail:image", "detail:link", "detail:note", "detail:marker", "annotation:relation", "annotation:summary", "annotation:boundary",
    "details", "annotations", "files", "export-png", "export-svg", "export-json", "export-xmind", "export-markdown", "export-outline", "export-pdf", "print"])
    expect(items.some(item => item.value === value), value).toBe(true);
});
it("keeps invalid root operations disabled while permitting a child", () => {
  expect(command("add-sibling")?.disabled).toBe(true);
  expect(command("remove")?.disabled).toBe(true);
  expect(command("add-child")?.disabled).toBe(false);
});
it("shares hierarchy labels, shortcuts and availability with the context menu", () => {
  const selected = { ...state, selectedIsRoot: false, structure: { ...state.structure, "add-parent": true } };
  const context = flatten(mindEditorContextItems(selected, true));
  for (const value of ["add-parent", "indent", "outdent", "move-up", "collapse-selected"])
    expect(context.find(item => item.value === value)).toEqual(command(value, selected));
  expect(command("add-parent", selected)?.disabled).toBe(false);
  expect(command("add-parent", { ...selected, composing: true })?.disabled).toBe(true);
});
it("distinguishes layout from folding without changing the toolbar label", () => {
  const item = command("layout", { ...state, layout: "logical-left" }) as QuireKitToolbarEntry;
  expect(item.text).toBe("布局");
  expect(item.items?.[0]?.selectedValue).toBe("layout:logical-left");
  expect(command("layout:logical-left")?.label).toBe("逻辑图（向左）");
  expect(command("collapse-all")?.label).toBe("全部折叠");
  expect(command("layout", { ...state, busy: true })?.disabled).toBe(true);
});
it("uses selection-specific insert guards without disabling the whole menu", () => {
  const none = { ...state, selectedId: null, selectedCount: 0, selectedIsRoot: false };
  expect(command("insert", none)?.disabled).toBe(false);
  expect(command("add-free", none)?.disabled).toBe(false);
  expect(command("detail:image", none)?.disabled).toBe(true);
  const multi = { ...none, selectedCount: 2 };
  expect(command("annotation:relation", multi)?.disabled).toBe(false);
  expect(command("detail:marker", multi)?.disabled).toBe(false);
  expect(command("detail:note", multi)?.disabled).toBe(true);
  expect(command("annotation:relation")?.disabled).toBe(true);
});
it("blocks composition and readonly mutations while allowing navigation and export", () => {
  expect(command("export", { ...state, composing: true })?.disabled).toBe(true);
  const readOnly = { ...state, readOnly: true };
  for (const value of ["add-child", "detail:image", "annotation:boundary", "collapse-all", "layout"])
    expect(command(value, readOnly)?.disabled, value).toBe(true);
  for (const value of ["export", "find", "view", "format"])
    expect(command(value, readOnly)?.disabled, value).toBe(false);
});
it("keeps task order stable through empty and multiple selections", () => {
  const order = mindEditorToolbar(state, true).filter(item => item.kind !== "separator").map(item => item.value);
  expect(order).toEqual(["files", "history", "add-child", "add-sibling", "insert", "edit", "format", "layout", "view", "export"]);
  expect(mindEditorToolbar({ ...state, selectedCount: 0 }, true).filter(item => item.kind !== "separator").map(item => item.value)).toEqual(order);
});
