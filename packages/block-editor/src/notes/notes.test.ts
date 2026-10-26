import { afterEach, expect, it } from "vitest";
import { createBlockEditor } from "../runtime/create";
import { readNotes } from "./query";
const sessions: ReturnType<typeof createBlockEditor>[] = [];
afterEach(() => sessions.splice(0).forEach(s => s.destroy()));
/** @returns Fresh canonical owner with ordinary text. */
function fixture() { const session = createBlockEditor({ content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Reference text" }] }] } }); sessions.push(session); return session.editor; }
it("inserts a linked editable note atomically, renumbers and removes both ends with undo", () => {
  const editor = fixture(); editor.commands.setTextSelection(5);
  const before = editor.getJSON();
  expect(editor.can().insertBlockFootnote()).toBe(true); expect(editor.getJSON()).toEqual(before);
  expect(editor.commands.insertBlockFootnote()).toBe(true);
  const notes = readNotes(editor.state.doc), note = notes[0]!;
  expect(note.number).toBe(1); expect(note.references).toHaveLength(1); expect(note.definitions).toHaveLength(1);
  expect(editor.state.pm.selection.$from.parent.type.name).toBe("paragraph");
  editor.commands.setTextSelection(editor.state.pm.selection.from);
  expect(readNotes(editor.state.doc)).toBe(notes);
  editor.commands.insertContent("Editable note body");
  expect(editor.commands.navigateBlockFootnote(note.id, "reference")).toBe(true);
  expect(editor.state.pm.selection.from).toBe(note.references[0]!.from);
  editor.commands.closeHistory();
  expect(editor.commands.removeBlockFootnote(note.id)).toBe(true); expect(readNotes(editor.state.doc)).toHaveLength(0);
  editor.commands.undo(); expect(editor.state.doc.textContent).toContain("Editable note body");
  editor.setEditable(false); expect(editor.commands.removeBlockFootnote(note.id)).toBe(false);
  expect(editor.commands.navigateBlockFootnote(note.id, "definition")).toBe(true);
});
it("keeps the original identity when copying before it and exposes unresolved imports without losing content", () => {
  const editor = fixture(); editor.commands.setTextSelection(3); editor.commands.insertBlockFootnote();
  const id = readNotes(editor.state.doc)[0]!.id, content = editor.getJSON().content!;
  editor.commands.insertContentAt(0, content);
  expect(readNotes(editor.state.doc).map(note => note.id)).toEqual([expect.not.stringMatching(id), id]);
  const imported = { type: "doc", content: [
    { type: "paragraph", content: [{ type: "footnoteReference", attrs: { noteId: "missing" } }] },
    { type: "footnoteDefinition", attrs: { noteId: "orphan" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Preserve orphan body" }] }] }
  ] };
  editor.commands.setContent(imported);
  expect(readNotes(editor.state.doc)).toMatchObject([{ id: "missing", definitions: [] }, { id: "orphan", references: [], number: 0 }]);
  expect(editor.state.doc.textContent).toContain("Preserve orphan body");
});
it("copies an entire note with independent identity while reference-only copies share numbering", () => {
  const editor = fixture(); editor.commands.setTextSelection(3); editor.commands.insertBlockFootnote();
  const note = readNotes(editor.state.doc)[0]!;
  editor.commands.insertContentAt(1, { type: "footnoteReference", attrs: { noteId: note.id } });
  expect(readNotes(editor.state.doc)[0]!.references).toHaveLength(2);
  const all = editor.getJSON().content!;
  editor.commands.insertContentAt(editor.state.doc.content.size, all);
  const notes = readNotes(editor.state.doc);
  expect(notes).toHaveLength(2); expect(notes.map(n => n.number)).toEqual([1, 2]);
  expect(notes.every(n => n.definitions.length === 1 && n.references.length === 2)).toBe(true);
});
