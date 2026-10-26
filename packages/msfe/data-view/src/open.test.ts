// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { createDataView, createDataViewDraft, dataViewMarkdown, type DataViewEditRequest } from "@quirekit/data-view";
import { MsfeDataView } from "./extension";
import { openMsfeDataView } from "./open";
import { captureMsfeDataViewTarget } from "./target";
import { dataViewProjection } from "./preview";

const editors: MsfeEditor[] = [];
const value = createDataView("lifetime"), source = dataViewMarkdown(value);
/** @returns An isolated source owner. */
function fixture(): MsfeEditor {
  const editor = createMsfeEditor({ parent: document.body.appendChild(document.createElement("div")), markdown: source, extensions: [MsfeDataView] });
  editors.push(editor); return editor;
}
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });

it("owns one task per editor and releases it once before restoring focus", () => {
  const editor = fixture(), focus = vi.spyOn(editor, "focus"), closed = vi.fn();
  let request: DataViewEditRequest;
  const open = vi.fn((next: DataViewEditRequest) => {
    request = next;
    return { close() { closed(); next.release(); } };
  });
  expect(openMsfeDataView(editor, open)).toBe(true);
  expect(openMsfeDataView(editor, open)).toBe(false);
  request!.release(); request!.release();
  expect(closed).toHaveBeenCalledTimes(1);
  expect(focus).toHaveBeenCalledTimes(1);
  expect(openMsfeDataView(editor, open)).toBe(true);
  editor.replaceDocument("replacement", "replacement");
  expect(closed).toHaveBeenCalledTimes(2);
  expect(focus).toHaveBeenCalledTimes(1);
});

it("does not register an already released synchronous workspace on the document", () => {
  const editor = fixture(), close = vi.fn();
  expect(openMsfeDataView(editor, request => { request.release(); return { close }; })).toBe(true);
  editor.replaceDocument("replacement", "replacement");
  expect(close).not.toHaveBeenCalled();
});

it("rejects read-only or deleted targets and keeps release idempotent", async () => {
  const editor = fixture(), range = { from: 0, to: source.length };
  const request = captureMsfeDataViewTarget(editor, range, value)!, draft = createDataViewDraft(value);
  editor.setReadOnly(true);
  expect((await request.commit(draft.prepare())).accepted).toBe(false);
  expect(openMsfeDataView(editor, () => ({ close() {} }))).toBe(false);
  editor.setReadOnly(false);
  editor.run(() => ({ changes: { ...range, insert: "" } }));
  editor.undo();
  expect(editor.getMarkdown()).toBe(source);
  expect((await request.commit(draft.prepare())).accepted).toBe(false);
  request.release(); request.release(); draft.dispose();
});

it("retains preview DOM on source displacement and captures an editor only on activation", () => {
  const editor = fixture(), getEditor = vi.fn(() => editor), measure = vi.fn();
  let request: DataViewEditRequest;
  const open = vi.fn((next: DataViewEditRequest) => { request = next; return { close: next.release }; });
  const dom = document.createElement("div"), range = { from: 0, to: source.length };
  const renderer = dataViewProjection(getEditor, open);
  const preview = renderer({ dom, props: { dataView: value, range, readOnly: false }, host: undefined, scope: editor.documentScope, requestMeasure: measure });
  const table = dom.querySelector("table"), figure = dom.querySelector("figure")!;
  editor.commands.insertText("prefix\n\n");
  preview.update({ dataView: value, range: { from: 8, to: 8 + source.length }, readOnly: false });
  expect(dom.querySelector("table")).toBe(table);
  expect(dom.querySelectorAll('thead th[scope="col"]')).toHaveLength(2);
  expect(measure).toHaveBeenCalledTimes(1);
  expect(getEditor).not.toHaveBeenCalled();
  figure.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true }));
  figure.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", shiftKey: true }));
  expect(open).not.toHaveBeenCalled();
  figure.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  expect(open).toHaveBeenCalledTimes(1);
  request!.release(); preview.destroy(); expect(dom.childElementCount).toBe(0);
});
