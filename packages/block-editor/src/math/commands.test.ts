// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createBlockEditor, type BlockEditorInstance } from "../index";
import { exportBlockBackup, importBlockBackup } from "../ui/files/document";
import { blockInsertItems } from "../ui/insert/catalog";
import { openBlockMath, registerBlockMathHost } from "./tasks";

const sessions: BlockEditorInstance[] = [];
/** @returns An isolated paragraph with a captured caret. */
function setup() {
  const instance = createBlockEditor({ content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "前后" }] }] } });
  sessions.push(instance); instance.editor.commands.setTextSelection(2); return instance.editor;
}
afterEach(() => sessions.splice(0).forEach(instance => instance.destroy()));

it("inserts an inline formula without losing adjacent text and undoes one confirmation", () => {
  const editor = setup(), before = editor.getJSON();
  expect(editor.commands.insertBlockMath({ latex: "  x^2 + y^2  " })).toBe(true);
  expect(editor.state.doc.firstChild?.child(1).attrs.latex).toBe("  x^2 + y^2  ");
  expect(editor.state.doc.textContent).toBe("前后");
  editor.commands.undo(); expect(editor.getJSON()).toEqual(before);
});

it("inserts a block formula at the captured range and updates only its original source", () => {
  const editor = setup(), doc = editor.state.doc;
  editor.commands.setTextSelection(1);
  expect(editor.commands.insertBlockMath({ latex: "\\frac{a}{b}", display: true, position: { from: 2, to: 2 }, expectedDocument: doc })).toBe(true);
  const position = editor.state.doc.child(0).nodeSize, node = editor.state.doc.nodeAt(position)!;
  expect(node.type.name).toBe("displayMath");
  const before = editor.getJSON();
  expect(editor.commands.updateBlockMath({ position, expected: node, latex: "\\sqrt{x}" })).toBe(true);
  expect(editor.commands.updateBlockMath({ position, expected: node, latex: "z" })).toBe(false);
  editor.commands.undo(); expect(editor.getJSON()).toEqual(before);
});

it("rejects invalid, empty, stale and read-only writes without side effects in can()", () => {
  const editor = setup(), doc = editor.state.doc;
  expect(editor.can().insertBlockMath({ latex: "x" })).toBe(true);
  expect(editor.state.doc).toBe(doc);
  for (const latex of [" ", "\\notACommand{x}", "\\frac{"]) expect(editor.commands.insertBlockMath({ latex })).toBe(false);
  editor.commands.insertContent("新");
  expect(editor.commands.insertBlockMath({ latex: "x", expectedDocument: doc })).toBe(false);
  editor.setEditable(false);
  expect(editor.commands.insertBlockMath({ latex: "x" })).toBe(false);
});

it("preserves exact source through JSON and HTML, including unsupported imported source", () => {
  const editor = setup(), source = "\\frac{a}{b} + x^2";
  editor.commands.insertBlockMath({ latex: source });
  const backup = exportBlockBackup(editor, "公式"), html = editor.getHTML();
  const restored = setup(); importBlockBackup(restored, backup);
  expect(restored.getJSON()).toEqual(editor.getJSON());
  restored.commands.setContent(html);
  expect(restored.state.doc.firstChild?.child(1).attrs.latex).toBe(source);
  restored.commands.setContent({ type: "doc", content: [{ type: "displayMath", attrs: { latex: "\\future{x}" } }] });
  expect(restored.state.doc.firstChild?.attrs.latex).toBe("\\future{x}");
});

it("offers both formula modes in all insertion menus and supports an explicit opt-out", () => {
  expect(blockInsertItems(setup(), "公式", true).map(item => item.id)).toEqual(["inlineMath", "displayMath"]);
  const instance = createBlockEditor({ preset: { math: false } }); sessions.push(instance);
  expect(blockInsertItems(instance.editor, "公式")).toEqual([]);
  expect(instance.editor.state.schema.nodes.inlineMath).toBeUndefined();
});

it("opens the selected atom before the paragraph Enter fallback without changing the document", () => {
  const editor = setup(); let source: string | undefined;
  const release = registerBlockMathHost(editor, request => { source = request.latex; });
  editor.commands.insertBlockMath({ latex: "x^2" }); editor.commands.setNodeSelection(2);
  const before = editor.state.doc;
  expect(editor.commands.keyboardShortcut("Enter")).toBe(true);
  expect(source).toBe("x^2"); expect(editor.state.doc).toBe(before);
  expect(openBlockMath(editor, false, { position: -1 })).toBe(false);
  expect(openBlockMath(editor, false, { position: before.content.size + 1 })).toBe(false);
  release();
});
