import { afterEach, expect, it, vi } from "vitest";
import { prepareEditorBlockMenu } from "@quirekit/editor-ui";
import { createBlockEditor } from "../runtime/create";
import { captureBlockTarget, executeBlockAction } from "../ui/blocks/actions";
import { blockStructureMenuItems } from "../ui/blocks/menu";
import { readNotes } from "./query";
import { captureNoteTarget, executeNoteAction } from "./target";

const sessions: ReturnType<typeof createBlockEditor>[] = [];
afterEach(() => { sessions.splice(0).forEach(session => session.destroy()); vi.restoreAllMocks(); });
/** @returns A shared reference, an independent note and an imported orphan. */
function fixture() {
  const session = createBlockEditor({ content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "正文" },
      ...["first", "first", "second"].map(noteId => ({ type: "footnoteReference", attrs: { noteId } }))] },
    ...["first", "second", "orphan"].map(noteId => ({ type: "footnoteDefinition", attrs: { noteId },
      content: [{ type: "paragraph", content: [{ type: "text", text: `${noteId} 说明文字` }] }] }))
  ] } });
  sessions.push(session);
  // Match a settled document after the first interaction, including its trailing
  // input paragraph, so undo assertions compare the same canonical baseline.
  session.editor.commands.setTextSelection(1);
  return session.editor;
}

it("resolves only the selected reference or caret ancestors and excludes text ranges and ordinary prose", () => {
  const editor = fixture(), note = readNotes(editor.state.doc)[0]!;
  editor.commands.navigateBlockFootnote(note.id, "definition");
  const descendants = vi.spyOn(editor.state.doc, "descendants");
  expect(captureNoteTarget(editor)).toMatchObject({ pos: note.definitions[0]!.from, node: note.definitions[0]!.node });
  expect(descendants).not.toHaveBeenCalled();
  editor.commands.setTextSelection({ from: note.definitions[0]!.from + 2, to: note.definitions[0]!.from + 4 });
  expect(captureNoteTarget(editor)).toBeNull();
  editor.commands.setTextSelection(1); expect(captureNoteTarget(editor)).toBeNull();
  editor.commands.navigateBlockFootnote(note.id, "reference");
  expect(captureNoteTarget(editor)).toMatchObject({ pos: note.references[0]!.from, node: note.references[0]!.node });
  editor.setEditable(false); expect(captureNoteTarget(editor)).toBeNull();
});

it("removes every reference to the displayed footnote in one undoable edit without touching other notes", () => {
  const editor = fixture(); editor.commands.navigateBlockFootnote("first", "definition");
  const before = editor.getJSON(), target = captureNoteTarget(editor)!;
  editor.commands.setTextSelection(target.pos + 4);
  expect(executeNoteAction(editor, target, "delete")).toBe(true);
  expect(readNotes(editor.state.doc).map(note => note.id)).toEqual(["second", "orphan"]);
  expect(editor.state.doc.firstChild!.textContent).toBe("正文");
  editor.commands.undo(); expect(editor.getJSON()).toEqual(before);
  editor.commands.navigateBlockFootnote("first", "reference");
  expect(executeNoteAction(editor, captureNoteTarget(editor)!, "navigate")).toBe(true);
  expect(captureNoteTarget(editor)!.node.type.name).toBe("footnoteDefinition");
});

it("rejects old controls after selection, source or permission changes", () => {
  const editor = fixture(); editor.commands.navigateBlockFootnote("first", "definition");
  const target = captureNoteTarget(editor)!;
  editor.commands.navigateBlockFootnote("second", "definition");
  const before = editor.getJSON();
  expect(executeNoteAction(editor, target, "delete")).toBe(false); expect(editor.getJSON()).toEqual(before);
  editor.commands.navigateBlockFootnote("first", "definition"); editor.commands.insertContent("修改");
  expect(executeNoteAction(editor, target, "delete")).toBe(false);
  const current = captureNoteTarget(editor)!;
  editor.setEditable(false); expect(executeNoteAction(editor, current, "delete")).toBe(false);
});

it("offers one block-menu delete action and routes it through complete note removal", () => {
  const editor = fixture(), note = readNotes(editor.state.doc)[0]!;
  const target = captureBlockTarget(editor, note.definitions[0]!.from)!;
  const featureMenu = prepareEditorBlockMenu(editor, target.block.from)!;
  const deletions = [...featureMenu.items, ...blockStructureMenuItems(target)].filter(item => item.label?.includes("删除"));
  expect(deletions).toMatchObject([{ value: "delete", label: "删除脚注及引用", icon: "trash" }]);
  const before = editor.getJSON();
  expect(executeBlockAction(editor, target, "delete")).toBe(true);
  expect(readNotes(editor.state.doc).map(note => note.id)).toEqual(["second", "orphan"]);
  editor.commands.undo(); expect(editor.getJSON()).toEqual(before);
  featureMenu.dispose();
});
