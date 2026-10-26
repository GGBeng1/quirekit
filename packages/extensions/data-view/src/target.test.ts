import { afterEach, expect, it } from "vitest";
import { createEditor, type QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { createDataView, createDataViewDraft, serializeDataView } from "@quirekit/data-view";
import { DataView } from "./extension";
import { captureDataViewTarget } from "./target";
const editors: QuireEditor[] = [];
/** @returns Headless owner with text before the atom. */
function fixture(): QuireEditor {
  const editor = createEditor({extensions: [StarterKit, DataView], content: {type: "doc", content: [{type: "paragraph", content: [{type: "text", text: "text"}]}, {type: "dataView", attrs: {dataView: createDataView("one")}}, {type: "paragraph"}]}});
  editors.push(editor); return editor;
}
afterEach(() => editors.splice(0).forEach(editor => editor.destroy()));
it("replaces a captured insertion range independently of focus and refuses a removed trigger", async () => {
  const editor = fixture(), before = editor.getJSON();
  const target = captureDataViewTarget(editor, undefined, { from: 0, to: 6 })!;
  editor.commands.setTextSelection(8);
  expect((await target.commit({ base: serializeDataView(target.value), value: target.value })).accepted).toBe(true);
  expect(editor.state.doc.firstChild?.type.name).toBe("dataView");
  editor.commands.undo(); expect(editor.getJSON()).toEqual(before); target.release();
  const stale = captureDataViewTarget(editor, undefined, { from: 0, to: 6 })!;
  editor.commands.deleteRange({ from: 0, to: 6 }); editor.commands.undo();
  expect((await stale.commit({ base: serializeDataView(stale.value), value: stale.value })).accepted).toBe(false);
  stale.release();
});
it("maps unrelated edits and saves as exactly one undo event", async () => {
  const editor = fixture(), target = captureDataViewTarget(editor, 6)!;
  const draft = createDataViewDraft(target.value);
  draft.replaceView({...target.value.views[0]!, name: "Changed"});
  editor.commands.insertContentAt(1, "prefix"); const before = editor.getJSON();
  expect((await target.commit(draft.prepare())).accepted).toBe(true);
  expect(editor.commands.undo()).toBe(true); expect(editor.getJSON()).toEqual(before);
  expect(editor.commands.redo()).toBe(true); expect(editor.state.pm.doc.nodeAt(12)?.attrs.dataView.views[0].name).toBe("Changed");
  target.release(); draft.dispose();
});
it("refuses a changed atom and deletion followed by undo", async () => {
  const editor = fixture(), target = captureDataViewTarget(editor, 6)!;
  const draft = createDataViewDraft(target.value); draft.replaceView({...target.value.views[0]!, name: "local"});
  editor.commands.deleteRange({from: 6, to: 7}); editor.commands.undo();
  expect((await target.commit(draft.prepare())).accepted).toBe(false); target.release();
  const second = captureDataViewTarget(editor, 6)!;
  editor.commands.replaceDataView({position: 6, expected: serializeDataView(second.value), value: {...second.value, defaultViewId: "board"}});
  expect((await second.commit(draft.prepare())).accepted).toBe(false); second.release(); draft.dispose();
});
it("cancel and can checks do not write; readonly blocks apply", async () => {
  const editor = fixture(), before = editor.getJSON(), target = captureDataViewTarget(editor)!;
  expect(editor.can().insertDataView({from: 1, to: 1, value: target.value})).toBe(true);
  expect(editor.getJSON()).toEqual(before);
  editor.setEditable(false);
  expect((await target.commit({base: serializeDataView(target.value), value: target.value})).accepted).toBe(false);
  target.release(); expect(editor.getJSON()).toEqual(before); expect(editor.can().undo()).toBe(false);
});
