import { describe, expect, it, vi } from "vitest";
import { createBlockEditor } from "@quirekit/block-editor";
import { resolveWordNumberingMarkers } from "@quirekit/classic-numbering-model";
import * as numbering from "@quirekit/classic-numbering-model";
import { acceptBlockSlash, readSlashTarget, insertAtBlockSlot } from "../../block-editor/src/ui/insert/execute";
import { captureBlockTarget, executeBlockAction } from "../../block-editor/src/ui/blocks/actions";
import { createBlockNumberingExtensions } from "./index";

/** @returns An unmounted real Block session with canonical list semantics. */
function create() {
  return createBlockEditor({ content: { type: "doc", content: ["第一项", "第二项", "第三项"].map(text => ({ type: "paragraph", content: [{ type: "text", text }] })) }, extensions: createBlockNumberingExtensions() });
}
describe("Classic numbering in Block", () => {
  it("shares counters, restart/continue, split reset and undo", () => {
    const instance = create(), editor = instance.editor;
    editor.commands.setTextSelection({ from: 1, to: editor.state.doc.content.size - 1 });
    expect(editor.commands.toggleBlockList("ordered")).toBe(true);
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()].map(marker => marker.text)).toEqual(["1.", "2.", "3."]);
    editor.commands.setTextSelection(6);
    editor.commands.closeHistory();
    expect(editor.commands.restartBlockList(4)).toBe(true);
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()].map(marker => marker.text)).toEqual(["1.", "4.", "5."]);
    editor.commands.setTextSelection(9);
    expect(editor.commands.splitBlock()).toBe(true);
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()].map(marker => marker.text)).toEqual(["1.", "4.", "5.", "6."]);
    editor.commands.undo();
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()].map(marker => marker.text)).toEqual(["1.", "2.", "3."]);
    instance.destroy();
  });
  it("preserves legacy list text, marks, starts and nested levels", () => {
    const instance = createBlockEditor({ extensions: createBlockNumberingExtensions(), content: {
      type: "doc", content: [{ type: "orderedList", attrs: { start: 4 }, content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "来源", marks: [{ type: "bold" }] }] },
          { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "子项" }] }] }] }] },
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "随后" }] }] }
      ] }]
    } });
    expect(instance.editor.state.doc.childCount).toBe(3);
    expect(instance.editor.state.doc.textContent).toBe("来源子项随后");
    expect(instance.editor.state.doc.firstChild?.firstChild?.marks[0]?.type.name).toBe("bold");
    expect([...resolveWordNumberingMarkers(instance.editor.state.doc).values()].map(marker => [marker.text, marker.level])).toEqual([["4.", 0], ["◦", 1], ["5.", 0]]);
    instance.destroy();
  });
  it("reuses task splitting and readonly admission", () => {
    const instance = create(), editor = instance.editor;
    expect(editor.commands.toggleBlockList("task")).toBe(true);
    editor.commands.toggleWordTaskChecked();
    editor.commands.setTextSelection(4);
    editor.commands.splitBlock();
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()].map(marker => marker.checked)).toEqual([true, false]);
    editor.setEditable(false);
    expect(editor.commands.toggleBlockList("bullet")).toBe(false);
    instance.destroy();
  });
  it("continues a restarted sequence and recomputes after a block move", () => {
    const instance = create(), editor = instance.editor;
    editor.commands.setTextSelection({ from: 1, to: 14 });
    editor.commands.toggleBlockList("ordered");
    editor.commands.setTextSelection(6);
    editor.commands.restartBlockList(8);
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()].map(marker => marker.text)).toEqual(["1.", "8.", "9."]);
    expect(editor.commands.continueBlockList()).toBe(true);
    const source = captureBlockTarget(editor, 10)!;
    expect(executeBlockAction(editor, source, "up")).toBe(true);
    expect(editor.state.doc.child(1).textContent).toBe("第三项");
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()].map(marker => marker.text)).toEqual(["1.", "2.", "3."]);
    instance.destroy();
  });
  it("routes slash and gutter insertion into the same owner with atomic undo", () => {
    const instance = create(), editor = instance.editor;
    editor.commands.setContent({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "/任务" }] }] });
    editor.commands.setTextSelection(4);
    const original = editor.getJSON();
    expect(acceptBlockSlash(editor, readSlashTarget(editor)!, "taskList")).toBe(true);
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()][0]?.kind).toBe("task");
    editor.commands.undo();
    expect(editor.getJSON()).toEqual(original);
    const target = captureBlockTarget(editor, 0)!;
    expect(insertAtBlockSlot(editor, { target: target.block, side: "after", expectedDocumentRevision: target.range.expectedDocumentRevision }, "orderedList")).toBe(true);
    expect(editor.state.doc.firstChild?.textContent).toBe("/任务");
    expect([...resolveWordNumberingMarkers(editor.state.doc).entries()].map(([pos, marker]) => [pos, marker.text])).toEqual([[5, "1."]]);
    instance.destroy();
  });
  it("keeps complex legacy items intact instead of dropping their extra paragraphs", () => {
    const content = { type: "doc", content: [{ type: "bulletList", content: [{ type: "listItem", content: [
      { type: "paragraph", content: [{ type: "text", text: "第一段" }] },
      { type: "paragraph", content: [{ type: "text", text: "补充段" }] }
    ] }] }] };
    const instance = createBlockEditor({ content, extensions: createBlockNumberingExtensions() });
    expect(instance.editor.state.doc.firstChild?.type.name).toBe("bulletList");
    expect(instance.editor.state.doc.textContent).toBe("第一段补充段");
    instance.editor.commands.setTextSelection(3);
    expect(instance.editor.commands.toggleBlockList("ordered")).toBe(false);
    instance.destroy();
  });
  it("maps marker presentation without recounting during selection, typing and mark edits", () => {
    const spy = vi.spyOn(numbering, "resolveWordNumberingMarkers");
    const instance = create(), editor = instance.editor;
    editor.commands.toggleBlockList("ordered");
    spy.mockClear();
    for (let index = 0; index < 20; index++) {
      editor.commands.setTextSelection(2);
      editor.commands.insertContent("x");
    }
    editor.commands.setTextSelection({ from: 1, to: 3 });
    editor.commands.toggleBold();
    expect(spy).not.toHaveBeenCalled();
    editor.commands.setTextSelection(1);
    editor.commands.splitBlock();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore(); instance.destroy();
  });
});
