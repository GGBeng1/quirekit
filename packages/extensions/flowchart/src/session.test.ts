import { afterEach, describe, expect, it } from "vitest";
import { createEditor, type QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { serializeFlowchart, createFlowchartEmbed, prepareFlowchartSave, serializeFlowchartEmbed } from "@quirekit/flowchart";
import { Flowchart } from "./extension";
import { captureFlowchartRequest } from "./session";

const editors: QuireEditor[] = [];
const flow = createFlowchartEmbed("sample");
const preview = { dataUrl: "data:image/png;base64,AAAA", width: 1, height: 1 };
/** @returns Word-free source editor containing an atom and ordinary text. */
function fixture(): QuireEditor {
  const editor = createEditor({ extensions: [StarterKit, Flowchart], content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "before" }] }, { type: "flowchart", attrs: { flow } }, { type: "paragraph" }
  ] } }); editors.push(editor); return editor;
}
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); });
describe("atomic PM flowchart sessions", () => {
  it("keeps canceled edits out of source and history", () => {
    const editor = fixture(), original = editor.getJSON(), request = captureFlowchartRequest(editor, 8)!;
    request.release(); expect(editor.getJSON()).toEqual(original); expect(editor.can().undo()).toBe(false);
    expect(request.commit(prepareFlowchartSave(flow, { ...preview, source: serializeFlowchart(flow.document) }))).toBe("missing");
  });
  it("maps unrelated insertions and commits an independently undoable revision", () => {
    const editor = fixture(), request = captureFlowchartRequest(editor, 8)!;
    editor.commands.insertContentAt(1, "added ");
    const beforeSave = editor.getJSON();
    expect(request.commit(prepareFlowchartSave(flow, { ...preview, source: serializeFlowchart(flow.document) }))).toBe("saved");
    request.release();
    expect(editor.commands.undo()).toBe(true); expect(editor.getJSON()).toEqual(beforeSave);
    expect(editor.commands.redo()).toBe(true); expect(editor.state.pm.doc.nodeAt(14)?.attrs.flow.document.revision).toBe(1);
  });
  it("rejects readonly, changed and deleted targets without losing the draft", () => {
    const editor = fixture(), request = captureFlowchartRequest(editor, 8)!;
    const next = prepareFlowchartSave(flow, { ...preview, source: serializeFlowchart(flow.document) });
    editor.setEditable(false); expect(request.commit(next)).toBe("readonly");
    editor.setEditable(true);
    expect(editor.commands.updateFlowchart({ position: 8, expected: serializeFlowchartEmbed(flow), document: next })).toBe(true);
    expect(request.commit(next)).toBe("conflict");
    editor.commands.deleteRange({ from: 8, to: 9 }); expect(request.commit(next)).toBe("missing"); request.release();
  });
  it("inserts only on save and never mutates in can mode", () => {
    const editor = fixture(), original = editor.getJSON(), fresh = createFlowchartEmbed("new");
    expect(editor.can().insertFlowchart({ document: fresh })).toBe(true); expect(editor.getJSON()).toEqual(original);
    const request = captureFlowchartRequest(editor)!; expect(editor.getJSON()).toEqual(original);
    expect(request.commit(prepareFlowchartSave(request.document, { ...preview, source: serializeFlowchart(request.document.document) }))).toBe("saved"); request.release();
    expect(editor.commands.undo()).toBe(true); expect(editor.getJSON()).toEqual(original);
  });
  it("rejects a target that was deleted and restored by undo", () => {
    const editor = fixture(), request = captureFlowchartRequest(editor, 8)!;
    editor.commands.deleteRange({ from: 8, to: 9 }); editor.commands.undo();
    expect(request.commit(prepareFlowchartSave(flow, { ...preview, source: serializeFlowchart(flow.document) }))).toBe("missing"); request.release();
  });
  it("rejects a complete document replacement, even with equal content", () => {
    const editor = fixture(), request = captureFlowchartRequest(editor, 8)!;
    editor.commands.setContent(editor.getJSON());
    expect(request.commit(prepareFlowchartSave(flow, { ...preview, source: serializeFlowchart(flow.document) }))).toBe("missing"); request.release();
  });
  it("refuses a different identity on insertion and accepts only one save per task", () => {
    const editor = fixture(), request = captureFlowchartRequest(editor)!;
    const next = prepareFlowchartSave(request.document, { ...preview, source: serializeFlowchart(request.document.document) });
    expect(request.commit({ ...next, id: "other" })).toBe("conflict");
    expect(request.commit(next)).toBe("saved"); const saved = editor.getJSON();
    expect(request.commit(next)).toBe("missing"); expect(editor.getJSON()).toEqual(saved); request.release();
  });
});

it("inserts into the explicit slot despite focus changes and maps unrelated edits", () => {
  const editor = fixture(), before = editor.getJSON();
  const request = captureFlowchartRequest(editor, undefined, { from: 8, to: 8 })!;
  expect(editor.getJSON()).toEqual(before);
  editor.commands.setTextSelection(10);
  editor.commands.insertContentAt(1, "prefix ");
  const next = prepareFlowchartSave(request.document, { ...preview, source: serializeFlowchart(request.document.document) });
  expect(request.commit(next)).toBe("saved");
  expect(editor.state.doc.child(1).attrs.flow.id).toBe(next.id);
  expect(editor.state.doc.child(2).attrs.flow.id).toBe(flow.id);
  request.release();
});
it("rejects deleted explicit targets and invalid ranges", () => {
  const editor = fixture();
  expect(captureFlowchartRequest(editor, undefined, { from: -1, to: 0 })).toBeNull();
  const request = captureFlowchartRequest(editor, undefined, { from: 0, to: 8 })!;
  editor.commands.deleteRange({ from: 0, to: 8 });
  expect(request.commit(prepareFlowchartSave(request.document, { ...preview, source: serializeFlowchart(request.document.document) }))).toBe("missing");
  request.release();
});
