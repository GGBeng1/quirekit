import { afterEach, expect, it } from "vitest";
import { createBlockEditor, type BlockEditorInstance } from "../index";
import { captureBlockTarget } from "../ui/blocks/actions";
import { acceptBlockSlash, insertAtBlockSlot, readSlashTarget } from "../ui/insert/execute";
import { commitBlockMath, openBlockMath, registerBlockMathHost } from "./tasks";
import type { BlockMathRequest } from "./types";

const sessions: BlockEditorInstance[] = [];
/** @returns A source-native document and mounted task callback without a browser UI. */
function setup() {
  const instance = createBlockEditor({ content: { type: "doc", content: ["/公式", "后文"].map(text => ({ type: "paragraph", content: [{ type: "text", text }] })) } }); sessions.push(instance);
  const editor = instance.editor; editor.commands.setTextSelection(4);
  let request: BlockMathRequest | undefined;
  const release = registerBlockMathHost(editor, source => { request = source; });
  return { editor, release, read: () => request! };
}
afterEach(() => sessions.splice(0).forEach(instance => instance.destroy()));

it("opens a slash draft without a write and replaces only its captured trigger on confirmation", () => {
  const { editor, read, release } = setup(), before = editor.getJSON();
  expect(acceptBlockSlash(editor, readSlashTarget(editor)!, "inlineMath")).toBe(true);
  expect(editor.getJSON()).toEqual(before);
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);
  expect(commitBlockMath(editor, read(), "x^2")).toBe(true);
  expect(editor.state.doc.firstChild?.firstChild?.type.name).toBe("inlineMath");
  expect(editor.state.doc.lastChild?.textContent).toBe("后文");
  editor.commands.undo(); expect(editor.getJSON()).toEqual(before);
  release(); expect(openBlockMath(editor)).toBe(false);
});

it("places a confirmed formula beside its captured block and rejects stale or read-only tasks", () => {
  const { editor, read } = setup(), target = captureBlockTarget(editor)!;
  const destination = { target: target.block, side: "after" as const, expectedDocumentRevision: target.range.expectedDocumentRevision };
  expect(insertAtBlockSlot(editor, destination, "displayMath")).toBe(true);
  expect(commitBlockMath(editor, read(), "\\sqrt{x}")).toBe(true);
  expect(editor.state.doc.child(1).type.name).toBe("displayMath");
  expect(openBlockMath(editor, true, { position: editor.state.doc.child(0).nodeSize })).toBe(true);
  editor.setEditable(false); expect(commitBlockMath(editor, read(), "y")).toBe(false);
  editor.setEditable(true); editor.commands.insertContentAt(1, "新");
  expect(commitBlockMath(editor, read(), "y")).toBe(false);
});
