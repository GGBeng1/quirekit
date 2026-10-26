import { afterEach, describe, expect, it } from "vitest";
import { createEditor, type QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { serializeTextDiagram, createTextDiagram, prepareTextDiagramSave } from "@quirekit/text-diagram";
import { TextDiagram } from "./extension";
import { captureTextDiagramRequest } from "./session";

const editors: QuireEditor[] = [];
const diagram = createTextDiagram("sample");
const preview = { dataUrl: "data:image/png;base64,iVBORw0KGgoAAA==", width: 1, height: 1 };
/** @returns Word-free source editor containing an atom and ordinary text. */
function fixture(): QuireEditor {
  const editor = createEditor({ extensions: [StarterKit, TextDiagram], content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "before" }] }, { type: "textDiagram", attrs: { diagram } }, { type: "paragraph" }
  ] } }); editors.push(editor); return editor;
}
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); });
describe("atomic PM textDiagram sessions", () => {
  it("keeps canceled edits out of source and history", () => {
    const editor = fixture(), original = editor.getJSON(), request = captureTextDiagramRequest(editor, 8)!;
    request.release(); expect(editor.getJSON()).toEqual(original); expect(editor.can().undo()).toBe(false);
    expect(request.commit(prepareTextDiagramSave(diagram, { ...preview, language: diagram.document.language, source: diagram.document.source }))).toBe("missing");
  });
  it("maps unrelated insertions and commits an independently undoable revision", () => {
    const editor = fixture(), request = captureTextDiagramRequest(editor, 8)!;
    editor.commands.insertContentAt(1, "added ");
    const beforeSave = editor.getJSON();
    expect(request.commit(prepareTextDiagramSave(diagram, { ...preview, language: diagram.document.language, source: diagram.document.source }))).toBe("saved");
    request.release();
    expect(editor.commands.undo()).toBe(true); expect(editor.getJSON()).toEqual(beforeSave);
    expect(editor.commands.redo()).toBe(true); expect(editor.state.pm.doc.nodeAt(14)?.attrs.diagram.document.revision).toBe(1);
  });
  it("rejects readonly, changed and deleted targets without losing the draft", () => {
    const editor = fixture(), request = captureTextDiagramRequest(editor, 8)!;
    const next = prepareTextDiagramSave(diagram, { ...preview, language: diagram.document.language, source: diagram.document.source });
    editor.setEditable(false); expect(request.commit(next)).toBe("readonly");
    editor.setEditable(true);
    expect(editor.commands.updateTextDiagram({ position: 8, expected: serializeTextDiagram(diagram), document: next })).toBe(true);
    expect(request.commit(next)).toBe("conflict");
    editor.commands.deleteRange({ from: 8, to: 9 }); expect(request.commit(next)).toBe("missing"); request.release();
  });
  it("inserts only on save and never mutates in can mode", () => {
    const editor = fixture(), original = editor.getJSON(), fresh = createTextDiagram("new");
    expect(editor.can().insertTextDiagram({ document: fresh })).toBe(true); expect(editor.getJSON()).toEqual(original);
    const request = captureTextDiagramRequest(editor)!; expect(editor.getJSON()).toEqual(original);
    expect(request.commit(prepareTextDiagramSave(request.document, { ...preview, language: request.document.document.language, source: request.document.document.source }))).toBe("saved"); request.release();
    expect(editor.commands.undo()).toBe(true); expect(editor.getJSON()).toEqual(original);
  });
  it("rejects a target that was deleted and restored by undo", () => {
    const editor = fixture(), request = captureTextDiagramRequest(editor, 8)!;
    editor.commands.deleteRange({ from: 8, to: 9 }); editor.commands.undo();
    expect(request.commit(prepareTextDiagramSave(diagram, { ...preview, language: diagram.document.language, source: diagram.document.source }))).toBe("missing"); request.release();
  });
  it("rejects a complete document replacement, even with equal content", () => {
    const editor = fixture(), request = captureTextDiagramRequest(editor, 8)!;
    editor.commands.setContent(editor.getJSON());
    expect(request.commit(prepareTextDiagramSave(diagram, { ...preview, language: diagram.document.language, source: diagram.document.source }))).toBe("missing"); request.release();
  });
  it("refuses a different identity on insertion and accepts only one save per task", () => {
    const editor = fixture(), request = captureTextDiagramRequest(editor)!;
    const next = prepareTextDiagramSave(request.document, { ...preview, language: request.document.document.language, source: request.document.document.source });
    expect(request.commit({ ...next, id: "other" })).toBe("conflict");
    expect(request.commit(next)).toBe("saved"); const saved = editor.getJSON();
    expect(request.commit(next)).toBe("missing"); expect(editor.getJSON()).toEqual(saved); request.release();
  });
});
