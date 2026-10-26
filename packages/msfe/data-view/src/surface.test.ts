// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { applyDataViewOperations, createDataView, dataViewMarkdown, serializeDataView } from "@quirekit/data-view";
import { MsfeDataView } from "./extension";
import { dataViewSurface } from "./surface";
import type { MsfeDataViewSurface } from "./types";

const editors: MsfeEditor[] = [];
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });
/** @returns A source-bound component with a controllable renderer lifecycle. */
function fixture() {
  const value = createDataView("inline"), source = dataViewMarkdown(value);
  const editor = createMsfeEditor({parent: document.body, markdown: source, extensions: [MsfeDataView]}); editors.push(editor);
  const getEditor = vi.fn(() => editor);
  let surface: MsfeDataViewSurface;
  const handle = dataViewSurface(getEditor, context => {
    surface = context.props;
    return {update(next) { surface = next; }, destroy() {}};
  })({dom: document.createElement("div"), props: {dataView: value, range: {from: 0, to: source.length}, readOnly: false}, host: undefined, scope: editor.documentScope, requestMeasure() {}});
  return {editor, value, source, getEditor, handle, surface: () => surface!};
}

it("lazily commits mapped inline changes as isolated document history", async () => {
  const f = fixture();
  expect(f.getEditor).not.toHaveBeenCalled();
  f.editor.commands.insertText("前文\n\n");
  f.handle.update({dataView: f.value, range: {from: 4, to: 4 + f.source.length}, readOnly: false});
  const next = applyDataViewOperations(f.value, [{type: "insert-record", record: {id: "row", values: {title: "正文编辑", status: "doing"}}}], {baseRevision: "inline:initial", revision: "1"});
  expect(await f.surface().commit({base: serializeDataView(f.value), value: next})).toEqual({accepted: true});
  expect(f.editor.getMarkdown()).toBe(`前文\n\n${dataViewMarkdown(next)}`);
  f.handle.update({dataView: next, range: {from: 4, to: 4 + dataViewMarkdown(next).length}, readOnly: false});
  expect((await f.surface().commit({base: serializeDataView(f.value), value: f.value})).accepted).toBe(false);
  expect(f.editor.getMarkdown()).toBe(`前文\n\n${dataViewMarkdown(next)}`);
  expect(f.surface().undo()).toBe(true); expect(f.editor.getMarkdown()).toBe(`前文\n\n${f.source}`);
  expect(f.surface().redo()).toBe(true); expect(f.editor.getMarkdown()).toContain("正文编辑");
  f.handle.destroy();
});

it("refuses stale source, read-only updates and callbacks from a destroyed surface", async () => {
  const f = fixture(), save = {base: serializeDataView(f.value), value: f.value};
  f.editor.commands.insertText("changed");
  expect((await f.surface().commit(save)).accepted).toBe(false);
  f.editor.undo();
  f.handle.update({dataView: f.value, range: {from: 0, to: f.source.length}, readOnly: true});
  expect((await f.surface().commit(save)).accepted).toBe(false);
  expect(f.surface().undo()).toBe(false);
  f.handle.destroy();
  expect((await f.surface().commit(save)).accepted).toBe(false);
});
