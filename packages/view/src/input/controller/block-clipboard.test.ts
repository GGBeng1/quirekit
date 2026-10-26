import { BlockSelection, createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { canvasInternalClipboardMime } from "@quirekit/clipboard";
import { expect, it } from "vitest";
import { createQuireEditorInputController } from "../controller";

/** @returns Real selection/controller pair and clipboard data adapter. */
function setup() {
  const editor = createEditor({ extensions: [StarterKit], content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "Alpha", marks: [{ type: "bold" }] }] },
    { type: "paragraph", content: [{ type: "text", text: "Beta" }] }
  ] } });
  const data = new Map<string, string>();
  const clipboardData = { setData: (type: string, value: string) => { data.set(type, value); }, getData: (type: string) => data.get(type) ?? "" };
  const first = editor.state.doc.firstChild!.nodeSize;
  editor.view.dispatch(editor.state.pm.tr.setSelection(BlockSelection.create(editor.state.doc, 0, first)!));
  return { editor, first, clipboardData, controller: createQuireEditorInputController({ editor }) };
}

it("copies the complete block to every MIME and pastes over another complete block", () => {
  const { editor, first, clipboardData, controller } = setup();
  const source = editor.state.doc.firstChild!;
  expect(controller.handleCopy({ clipboardData }).handled).toBe(true);
  expect(JSON.parse(clipboardData.getData(canvasInternalClipboardMime)).slice.content).toEqual([source.toJSON()]);
  expect(clipboardData.getData("text/html")).toContain("<strong>Alpha</strong>");
  expect(clipboardData.getData("text/plain")).toBe("Alpha");
  editor.view.dispatch(editor.state.pm.tr.setSelection(BlockSelection.create(editor.state.doc, first, editor.state.doc.content.size)!));
  expect(controller.handlePaste({ clipboardData })).toMatchObject({ handled: true, docChanged: true });
  expect(editor.state.doc.childCount).toBe(2);
  expect(editor.state.doc.lastChild!.eq(source)).toBe(true);
  editor.commands.undo(); expect(editor.state.doc.lastChild!.textContent).toBe("Beta");
  editor.destroy();
});

it("cuts and deletes a block through native input with one-step undo", () => {
  for (const action of ["cut", "delete"]) {
    const { editor, clipboardData, controller } = setup();
    const before = editor.state.doc;
    const result = action === "cut" ? controller.handleCut({ clipboardData }) : controller.handleKeyDown({ key: "Backspace" });
    expect(result).toMatchObject({ handled: true, docChanged: true });
    expect(editor.state.doc.textContent).toBe("Beta");
    if (action === "cut") expect(clipboardData.getData(canvasInternalClipboardMime)).toContain("Alpha");
    editor.commands.undo(); expect(editor.state.doc.eq(before)).toBe(true);
    editor.destroy();
  }
});
