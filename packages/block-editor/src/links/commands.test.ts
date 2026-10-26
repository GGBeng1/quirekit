// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createBlockEditor, type BlockEditorInstance } from "../runtime";
import { captureBlockLink, applyBlockLink, removeBlockLink } from "./commands";

const instances: BlockEditorInstance[] = [];
/** @returns Two occurrences of the same destination with mixed formatting in the first. */
function setup() {
  const link = { type: "link", attrs: { href: "https://example.com" } };
  const instance = createBlockEditor({ content: { type: "doc", content: [
    { type: "paragraph", content: [
      { type: "text", text: "Hello", marks: [link, { type: "bold" }] },
      { type: "text", text: " world", marks: [link, { type: "italic" }] }
    ] },
    { type: "paragraph", content: [{ type: "text", text: "Other", marks: [link] }] }
  ] } });
  instances.push(instance); instance.editor.commands.setTextSelection(3); return instance.editor;
}
afterEach(() => { for (const instance of instances.splice(0)) instance.destroy(); });

it("edits the whole occurrence, keeps mixed runs for address-only changes and independently undoes removal", () => {
  const editor = setup(), original = editor.getJSON();
  const source = captureBlockLink(editor)!;
  expect(source.text).toBe("Hello world");
  expect(applyBlockLink(editor, source, "example.org", source.text)).toBe(true);
  const paragraph = editor.state.doc.firstChild!;
  expect(paragraph.childCount).toBe(2);
  expect(paragraph.child(0).marks.some(mark => mark.type.name === "bold")).toBe(true);
  expect(paragraph.child(1).marks.some(mark => mark.type.name === "italic")).toBe(true);
  expect(paragraph.child(1).marks.find(mark => mark.type.name === "link")?.attrs.href).toBe("https://example.org");
  expect(editor.state.doc.child(1).firstChild?.marks[0]?.attrs.href).toBe("https://example.com");
  const changed = editor.getJSON();
  expect(removeBlockLink(editor, captureBlockLink(editor)!)).toBe(true);
  expect(editor.state.doc.firstChild?.child(1).marks.map(mark => mark.type.name)).toEqual(["italic"]);
  editor.commands.undo(); expect(editor.getJSON()).toEqual(changed);
  editor.commands.undo(); expect(editor.getJSON()).toEqual(original);
});

it("renames the full link from a partial selection without touching its neighbour", () => {
  const editor = setup(); editor.commands.setTextSelection({ from: 2, to: 4 });
  expect(applyBlockLink(editor, captureBlockLink(editor)!, "https://example.org", "新名称")).toBe(true);
  expect(editor.state.doc.firstChild?.textContent).toBe("新名称");
  expect(editor.state.doc.child(1).textContent).toBe("Other");
  expect(editor.state.doc.firstChild?.firstChild?.marks.some(mark => mark.type.name === "bold")).toBe(true);
});

it("rejects invalid destinations and stale document, selection or edit permission without mutation", () => {
  const editor = setup(), source = captureBlockLink(editor)!, before = editor.getJSON();
  expect(applyBlockLink(editor, source, "javascript:alert(1)", source.text)).toBe(false);
  expect(applyBlockLink(editor, source, "https://example.org", "two\nlines")).toBe(false);
  expect(editor.getJSON()).toEqual(before);
  editor.commands.setTextSelection(15);
  expect(applyBlockLink(editor, source, "https://example.org", "wrong")).toBe(false);
  expect(removeBlockLink(editor, source)).toBe(false);
  editor.commands.setTextSelection(3);
  editor.commands.insertContent("new");
  expect(removeBlockLink(editor, source)).toBe(false);
  const current = captureBlockLink(editor)!; editor.setEditable(false);
  expect(applyBlockLink(editor, current, "https://example.org", "wrong")).toBe(false);
});

it("creates labelled links at the caret and across plain text without losing first-run formatting", () => {
  const editor = setup(); editor.commands.setContent("<p><strong>plain</strong> text</p>");
  editor.commands.setTextSelection({ from: 1, to: 6 });
  expect(applyBlockLink(editor, captureBlockLink(editor)!, "example.org", "标签")).toBe(true);
  expect(editor.state.doc.firstChild?.textContent).toBe("标签 text");
  expect(editor.state.doc.firstChild?.firstChild?.marks.map(mark => mark.type.name)).toEqual(expect.arrayContaining(["link", "bold"]));
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);
  expect(applyBlockLink(editor, captureBlockLink(editor)!, "example.org/new", "新链接")).toBe(true);
  expect(editor.state.doc.firstChild?.textContent).toBe("标签 text新链接");
});

it("retains multi-paragraph structure and inline atoms, allowing only address changes", () => {
  const editor = setup(); editor.commands.setContent("<p>One</p><p>Two</p>");
  editor.commands.setTextSelection({ from: 1, to: 9 });
  const selection = captureBlockLink(editor)!;
  expect(selection.textEditable).toBe(false);
  expect(applyBlockLink(editor, selection, "example.org", "replace")).toBe(false);
  expect(applyBlockLink(editor, selection, "example.org", selection.text)).toBe(true);
  expect(editor.state.doc.childCount).toBe(2);
  editor.commands.setContent('<p><a href="https://example.com">One<br>Two</a></p>');
  editor.commands.setTextSelection(2);
  const atom = captureBlockLink(editor)!;
  expect(atom.textEditable).toBe(false);
  expect(applyBlockLink(editor, atom, "example.org", "replace")).toBe(false);
  expect(applyBlockLink(editor, atom, "example.org", atom.text)).toBe(true);
  expect(editor.state.doc.firstChild?.child(1).type.name).toBe("hardBreak");
});
