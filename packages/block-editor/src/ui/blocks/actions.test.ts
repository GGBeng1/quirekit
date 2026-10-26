import { afterEach, expect, it } from "vitest";
import { createBlockEditor, type BlockEditorInstance } from "../../index";
import { captureBlockTarget, executeBlockAction } from "./actions";

const sessions: BlockEditorInstance[] = [];
/** @returns A fresh document with independent top-level blocks. */
function setup() {
  const instance = createBlockEditor({ content: { type: "doc", content: ["Alpha", "Beta", "Gamma"].map(text => ({ type: "paragraph", content: [{ type: "text", text }] })) } });
  sessions.push(instance);
  return instance.editor;
}
afterEach(() => sessions.splice(0).forEach(instance => instance.destroy()));

it("copies a captured block with a fresh identity and undoes the entire operation", () => {
  const editor = setup();
  editor.commands.setTextSelection(2);
  const before = editor.getJSON();
  const target = captureBlockTarget(editor)!;
  editor.commands.setTextSelection(9);
  expect(executeBlockAction(editor, target, "duplicate")).toBe(true);
  expect(editor.state.doc.child(1).textContent).toBe("Alpha");
  expect(editor.state.doc.child(1).attrs.blockId).not.toBe(editor.state.doc.child(0).attrs.blockId);
  editor.commands.undo();
  expect(editor.getJSON()).toEqual(before);
});

it("moves full blocks atomically, rejects boundaries and stale or read-only targets", () => {
  const editor = setup();
  const first = captureBlockTarget(editor)!;
  expect(executeBlockAction(editor, first, "up")).toBe(false);
  expect(executeBlockAction(editor, first, "down")).toBe(true);
  expect(editor.state.doc.child(0).textContent).toBe("Beta");
  expect(executeBlockAction(editor, first, "delete")).toBe(false);
  editor.commands.undo();
  expect(editor.state.doc.child(0).textContent).toBe("Alpha");
  const target = captureBlockTarget(editor)!;
  editor.setEditable(false);
  const before = editor.getJSON();
  expect(executeBlockAction(editor, target, "delete")).toBe(false);
  expect(editor.getJSON()).toEqual(before);
});

it("inserts beside a whole list and removes only the captured block", () => {
  const editor = setup();
  editor.commands.toggleBulletList();
  const target = captureBlockTarget(editor)!;
  expect(target.block.node.type.name).toBe("bulletList");
  expect(executeBlockAction(editor, target, "after")).toBe(true);
  expect(editor.state.doc.child(0).type.name).toBe("bulletList");
  expect(editor.state.doc.child(1).type.name).toBe("paragraph");
  expect(editor.state.doc.child(1).textContent).toBe("");
  expect(executeBlockAction(editor, captureBlockTarget(editor)!, "delete")).toBe(true);
  expect(editor.state.doc.child(1).textContent).toBe("Beta");
});

it("keeps an existing multi-block selection for menu, duplicate, move and delete", () => {
  const editor = setup();
  const first = captureBlockTarget(editor, 0)!, second = captureBlockTarget(editor, 7)!;
  editor.commands.selectBlockRange({ ...first.range, focus: second.block });
  const range = captureBlockTarget(editor, 7)!;
  expect(range.blocks.map(block => block.node.textContent)).toEqual(["Alpha", "Beta"]);
  expect(executeBlockAction(editor, range, "down")).toBe(true);
  expect(editor.state.doc.textContent).toBe("GammaAlphaBeta");
  editor.commands.undo();
  editor.commands.selectBlockRange({ ...captureBlockTarget(editor, 0)!.range, focus: captureBlockTarget(editor, 7)!.blocks.at(-1)! });
  const again = captureBlockTarget(editor)!;
  expect(executeBlockAction(editor, again, "duplicate")).toBe(true);
  expect(editor.state.doc.textContent).toBe("AlphaBetaAlphaBetaGamma");
  editor.commands.undo();
  editor.commands.selectBlockRange({ ...captureBlockTarget(editor, 0)!.range, focus: captureBlockTarget(editor, 7)!.blocks.at(-1)! });
  expect(executeBlockAction(editor, captureBlockTarget(editor)!, "delete")).toBe(true);
  expect(editor.state.doc.textContent).toBe("Gamma");
});
