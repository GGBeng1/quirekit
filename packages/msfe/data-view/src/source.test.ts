// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { createDataView, dataViewMarkdown, createDataViewDraft } from "@quirekit/data-view";
import { MsfeDataView } from "./extension";
import { captureMsfeDataViewTarget } from "./target";
const editors: MsfeEditor[] = [];
const value = createDataView("markdown"), fence = dataViewMarkdown(value);
/** @param markdown - Test source. @returns Isolated source owner. */
function fixture(markdown = `start\n\n${fence}\n\nend`): MsfeEditor {
  const editor = createMsfeEditor({parent: document.body.appendChild(document.createElement("div")), markdown, extensions: [MsfeDataView]}); editors.push(editor); return editor;
}
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });
it("reads canonical source and preserves unknown versions literally", () => {
  const editor = fixture();
  expect(editor.querySource("dataView", {from: 0, to: editor.state.doc.length}).matches[0]?.attrs.dataView).toEqual(value);
  const unknown = fence.replace('"version":1', '"version":8'); editor.replaceDocument(unknown, "unknown");
  expect(editor.querySource("dataView", {from: 0, to: editor.state.doc.length}).matches).toHaveLength(0); expect(editor.getMarkdown()).toBe(unknown);
});
it("tracks source displacement, commits once and undoes exactly the fence", async () => {
  const editor = fixture(), request = captureMsfeDataViewTarget(editor, {from: 7, to: 7 + fence.length}, value)!;
  const draft = createDataViewDraft(value); draft.replaceView({...value.views[0]!, name: "中文输入"});
  editor.commands.insertText("prefix "); const before = editor.getMarkdown();
  expect((await request.commit(draft.prepare())).accepted).toBe(true); expect(editor.getMarkdown()).toContain("中文输入");
  editor.undo(); expect(editor.getMarkdown()).toBe(before);
  expect((await request.commit(draft.prepare())).accepted).toBe(false); request.release(); draft.dispose();
});
it("does not let a stale draft overwrite replaced source", async () => {
  const editor = fixture(), request = captureMsfeDataViewTarget(editor, {from: 7, to: 7 + fence.length}, value)!;
  const draft = createDataViewDraft(value); editor.replaceDocument(editor.getMarkdown(), "new-owner");
  expect((await request.commit(draft.prepare())).accepted).toBe(false); request.release(); draft.dispose();
});
it("inserts beside existing code without breaking its syntax", async () => {
  const code = "```js\nconst n = 1;\n```", editor = fixture(code), request = captureMsfeDataViewTarget(editor, {from: 10, to: 10})!;
  const draft = createDataViewDraft(request.value);
  expect((await request.commit(draft.prepare())).accepted).toBe(true); expect(editor.getMarkdown().startsWith(code)).toBe(true);
  expect(editor.querySource("dataView", {from: 0, to: editor.state.doc.length}).matches).toHaveLength(1);
  editor.undo(); expect(editor.getMarkdown()).toBe(code); request.release(); draft.dispose();
});
