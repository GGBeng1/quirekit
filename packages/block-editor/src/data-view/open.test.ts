// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { DOMParser, DOMSerializer } from "@quirekit/pm";
import { createDataViewDraft, type DataViewEditRequest } from "@quirekit/data-view";
import { createBlockEditor, type BlockEditorInstance } from "../runtime";
import { insertBlockDataView } from "./open";

const instances: BlockEditorInstance[] = [];
/** @param options - Product configuration. @returns An isolated document owner. */
function fixture(options: Parameters<typeof createBlockEditor>[0] = {}): BlockEditorInstance {
  const instance = createBlockEditor({ content: { type: "doc", content: [{ type: "paragraph" }] }, ...options });
  instances.push(instance); return instance;
}
afterEach(() => { instances.splice(0).forEach(instance => instance.destroy()); });

it("uses the configured workspace and preserves the canonical atom across JSON and HTML", async () => {
  let request: DataViewEditRequest;
  const open = vi.fn((next: DataViewEditRequest) => { request = next; return { close: next.release }; });
  const { editor } = fixture({ preset: { dataView: { open } } });
  expect(insertBlockDataView(editor)).toBe(true);
  expect(open).toHaveBeenCalledTimes(1);
  const before = editor.getJSON(), draft = createDataViewDraft(request!.value);
  draft.replaceView({ ...request!.value.views[0]!, name: "项目表格" });
  expect((await request!.commit(draft.prepare())).accepted).toBe(true);
  request!.release(); draft.dispose();
  const json = editor.getJSON(), restored = fixture({ content: json });
  expect(restored.editor.getJSON()).toEqual(json);
  const element = document.createElement("div"), schema = editor.state.pm.schema;
  element.append(DOMSerializer.fromSchema(schema).serializeFragment(editor.state.pm.doc.content, { document }));
  // Block identities are deliberately document-local; the portable atom payload
  // must round-trip while a newly loaded HTML document allocates fresh identities.
  /** @param value - Canonical or parsed JSON. @returns Content without document-local block identities. */
  const portable = (value: unknown) => JSON.parse(JSON.stringify(value, (key, entry) => key === "blockId" ? undefined : entry));
  expect(portable(DOMParser.fromSchema(schema).parse(element).toJSON())).toEqual(portable(json));
  expect(editor.commands.undo()).toBe(true); expect(editor.getJSON()).toEqual(before);
  expect(editor.commands.redo()).toBe(true); expect(editor.getJSON()).toEqual(json);
});

it("respects disabled, hostless and read-only product configurations", () => {
  const open = vi.fn((request: DataViewEditRequest) => ({ close: request.release }));
  const disabled = fixture({ preset: { dataView: false } });
  expect(insertBlockDataView(disabled.editor)).toBe(false);
  expect(disabled.editor.state.pm.schema.nodes.dataView).toBeUndefined();
  expect(insertBlockDataView(fixture({ preset: { dataView: { open: null } } }).editor)).toBe(false);
  const readonly = fixture({ editable: false, preset: { dataView: { open } } });
  expect(insertBlockDataView(readonly.editor)).toBe(false);
  expect(open).not.toHaveBeenCalled();
});

it("cancels without changing source and closes the workspace with its owner", () => {
  let request: DataViewEditRequest;
  const close = vi.fn(() => request.release());
  const instance = fixture({ preset: { dataView: { open: next => { request = next; return { close }; } } } });
  const before = instance.editor.getJSON();
  expect(insertBlockDataView(instance.editor)).toBe(true);
  expect(insertBlockDataView(instance.editor)).toBe(false);
  request!.release(); expect(instance.editor.getJSON()).toEqual(before);
  expect(instance.editor.can().undo()).toBe(false);
  expect(insertBlockDataView(instance.editor)).toBe(true);
  instance.destroy(); expect(close).toHaveBeenCalledTimes(1);
});
