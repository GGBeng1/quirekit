// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { applyDataViewOperations, createDataView, dataViewMarkdown, type DataViewEmbed } from "@quirekit/data-view";
import { MsfeDataView } from "./extension";

const editors: MsfeEditor[] = [];
const empty = createDataView("copied");
if (empty.source.kind !== "inline") throw new Error("Expected local fixture");
const initial = applyDataViewOperations(empty, [{ type: "insert-record", record: { id: "task", values: { title: "任务", status: "todo" } } }],
  { baseRevision: empty.source.dataset.revision, revision: "records" });

/** @param markdown - Initial exact source. @returns One isolated source owner. */
function fixture(markdown = ""): MsfeEditor {
  const editor = createMsfeEditor({ parent: document.body.appendChild(document.createElement("div")), markdown, extensions: [MsfeDataView] });
  editors.push(editor);
  return editor;
}
/** @param editor - Source owner. @param text - Native clipboard text. @param from - Insertion position. */
function paste(editor: MsfeEditor, text: string, from = editor.state.doc.length): void {
  expect(editor.run(() => ({ changes: { from, insert: text }, userEvent: "input.paste" })).ok).toBe(true);
}
/** @param editor - Source owner. @returns Every confirmed embed in source order. */
function embeds(editor: MsfeEditor): DataViewEmbed[] {
  return editor.querySource("dataView", { from: 0, to: editor.state.doc.length }).matches.map(match => match.attrs.dataView as DataViewEmbed);
}
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });

it("forks each pasted inline envelope independently and keeps one undo event", () => {
  const fence = dataViewMarkdown(initial), editor = fixture(fence);
  paste(editor, `\n\n${fence}`);
  const first = editor.getMarkdown(), values = embeds(editor);
  expect(values[0]).toEqual(initial);
  expect(values[1]!.id).not.toBe(initial.id);
  expect(values[1]!.source).not.toEqual(initial.source);
  if (values[1]!.source.kind === "inline" && initial.source.kind === "inline") {
    expect(values[1]!.source.dataset.records[0]!.id).not.toBe(initial.source.dataset.records[0]!.id);
    expect(values[1]!.source.dataset.records[0]!.values).toEqual(initial.source.dataset.records[0]!.values);
  }
  paste(editor, `\n\n${fence}`);
  expect(new Set(embeds(editor).map(value => value.id)).size).toBe(3);
  editor.undo();
  // Separate paste gestures must not merge into one undo event.
  expect(editor.getMarkdown()).toBe(first);
  editor.redo(); expect(embeds(editor)).toHaveLength(3);
});

it("forks valid pasted data beyond the ordinary text paste budget", () => {
  const large = applyDataViewOperations(initial, [{ type: "set-cell", recordId: "task", fieldId: "title", value: "x".repeat(70000) }],
    { baseRevision: "records", revision: "large" });
  const editor = fixture(); paste(editor, dataViewMarkdown(large));
  expect(embeds(editor)[0]!.id).not.toBe(large.id);
  expect(editor.getMarkdown()).toContain("x".repeat(70000));
});

it("retains external references while allocating a new embed identity", () => {
  const external: DataViewEmbed = { ...initial, source: { kind: "remote", provider: "tasks", datasetId: "shared", endpoint: "https://example.test/data" } };
  const editor = fixture(); paste(editor, dataViewMarkdown(external));
  expect(embeds(editor)[0]!.id).not.toBe(external.id);
  expect(embeds(editor)[0]!.source).toEqual(external.source);
});

it("preserves unknown, nested and explicitly imported source without rewriting identities", () => {
  const fence = dataViewMarkdown(initial), editor = fixture();
  const unknown = fence.replace('"version":1', '"version":999');
  paste(editor, unknown); expect(editor.getMarkdown()).toBe(unknown);
  editor.replaceDocument("````text\n\n````", "nested");
  paste(editor, fence, 10); expect(editor.getMarkdown()).toContain(fence);
  expect(embeds(editor)).toEqual([]);
  editor.replaceDocument(fence, "import"); expect(embeds(editor)[0]).toEqual(initial);
});
