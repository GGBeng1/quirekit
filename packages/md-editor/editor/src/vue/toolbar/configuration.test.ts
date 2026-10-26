import { describe, expect, it, vi } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import type { MsfeEditor } from "@quirekit/msfe-core";
import { quireIconRegistry, type QuireKitMenuEntry } from "@quirekit/ui";
import { toolbarHistoryItems, toolbarItems } from "./configuration";
import { selectionToolbarItems } from "./presentation";
import { insertionItems } from "./insertion";
import { insertionBlocks } from "./blocks";

describe("shared product toolbar", () => {
  it("reads mobile history availability without querying or serializing document content", () => {
    const querySource = vi.fn(), getMarkdown = vi.fn();
    const editor = { history: { canUndo: true, canRedo: false }, state: EditorState.create(), querySource, getMarkdown } as unknown as MsfeEditor;
    const history = toolbarHistoryItems(editor, "zh-CN").children!;
    expect(history.map(item => [item.value, item.disabled])).toEqual([["undo", false], ["redo", true]]);
    expect(querySource).not.toHaveBeenCalled(); expect(getMarkdown).not.toHaveBeenCalled();
  });
  it("uses public history availability even without a CodeMirror history field", () => {
    const editor = { history: { canUndo: true, canRedo: false }, state: EditorState.create(), storage: {}, querySource: () => ({ matches: [] }) } as unknown as MsfeEditor;
    const history = toolbarItems(editor, "zh-CN").find(item => item.value === "history")!.children!;
    expect(history.find(item => item.value === "undo")?.disabled).toBe(false);
    expect(history.find(item => item.value === "redo")?.disabled).toBe(true);
  });
  it('lists only installed format exporters, independently of Word and editing permission', () => {
    const editor = { history: { canUndo: false, canRedo: false }, state: EditorState.create({ extensions: [EditorState.readOnly.of(true)] }), storage: {}, querySource: () => ({ matches: [] }) } as unknown as MsfeEditor;
    const none = leaves(toolbarItems(editor, 'zh-CN', false).find(item => item.value === 'files')!.items!);
    expect(none.some(item => item.value.startsWith('export:'))).toBe(false);
    const items = leaves(toolbarItems(editor, 'zh-CN', false, 'Chosen', [{ id: 'pdf', format: 'PDF' }, { id: 'ofd', format: 'OFD' }]).find(item => item.value === 'files')!.items!);
    expect(items.filter(item => item.value.startsWith('export:')).map(item => [item.value, item.label, !!item.disabled]))
      .toEqual([['export:pdf', '导出 PDF', false], ['export:ofd', '导出 OFD', false]]);
    expect(items.find(item => item.value === 'wordExport')).toBeUndefined();
    expect(items.find(item => item.value === 'exportTemplate')).toMatchObject({ label: '导出样式设置', icon: 'slidersHorizontal' });
  });
  it("reduces the floating selection toolbar to text style, primary inline formats and link", () => {
    const editor = { history: { canUndo: false, canRedo: false }, state: EditorState.create(), storage: {}, querySource: () => ({ matches: [] }) } as unknown as MsfeEditor;
    const entries = selectionToolbarItems(toolbarItems(editor, "zh-CN"));
    expect(entries.map(item => item.kind === "separator" ? "|" : item.value)).toEqual(["heading", "|", "format", "|", "link"]);
    expect(entries.find(item => item.value === "format")!.children!.map(item => item.value))
      .toEqual(["bold", "emphasis", "strike", "insertedText", "inlineCode", "highlight"]);
  });
  it("uses a real style field and exposes every text format without a More menu", () => {
    const editor = { history: { canUndo: false, canRedo: false }, state: EditorState.create(), storage: {}, querySource: () => ({ matches: [] }) } as unknown as MsfeEditor;
    const entries = toolbarItems(editor, "zh-CN");
    expect(entries.find(item => item.value === "heading")?.kind).toBe("custom");
    const formats = entries.find(item => item.value === "format")!.children!;
    expect(formats.some(item => item.kind === "menu")).toBe(false);
    for (const value of ["highlight", "superscript", "subscript"]) expect(formats.some(item => item.value === value && !!item.icon)).toBe(true);
  });
});

/** @param entries - Public insertion groups. @returns Leaf commands recursively. */
function leaves(entries: readonly QuireKitMenuEntry[]): QuireKitMenuEntry[] {
  return entries.flatMap(entry => entry.children ? leaves(entry.children) : [entry]);
}
it("gives every insertion command a registered shared icon", () => {
  const storage = Object.fromEntries(insertionBlocks("zh-CN").map(block => [block.feature, {}]));
  const items = leaves(insertionItems({ storage, state: EditorState.create() } as unknown as MsfeEditor, "zh-CN"));
  expect(items.some(item => item.value === "insert-divider")).toBe(true);
  for (const item of items) { expect(item.icon).toBeTruthy(); expect(quireIconRegistry.has(item.icon!)).toBe(true); }
});
