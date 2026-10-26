// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { serializeFlowchart, createFlowchartEmbed, prepareFlowchartSave } from "@quirekit/flowchart";
import { MsfeFlowchart } from "./extension";
import { flowchartPreview } from "./renderer";
import { flowchartMarkdown } from "./source";
import { captureMsfeFlowchartRequest } from "./session";
const flow = createFlowchartEmbed("source-flow"), source = flowchartMarkdown(flow);
const editors: MsfeEditor[] = [];
const preview = { dataUrl: "data:image/png;base64,AAAA", width: 1, height: 1 };
/** @returns Independent Markdown owner. */
function fixture(): MsfeEditor {
  const parent = document.body.appendChild(document.createElement("div"));
  const editor = createMsfeEditor({ parent, markdown: `before\n\n${source}\n\nafter`, extensions: [MsfeFlowchart] });
  editors.push(editor); return editor;
}
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });
describe("source-owned flowcharts", () => {
  it("decodes valid fences and keeps unknown versions as source", () => {
    const editor = fixture();
    expect(editor.querySource("flowchart", { from: 0, to: editor.state.doc.length }).matches).toHaveLength(1);
    expect(editor.querySource("flowchart", { from: 0, to: editor.state.doc.length }).matches[0]!.attrs.flow).toEqual(flow);
    editor.replaceDocument(source.replace('"version":1', '"version":99'), "other");
    expect(editor.querySource("flowchart", { from: 0, to: editor.state.doc.length }).matches).toHaveLength(0);
  });
  it("maps earlier text and makes a save one history event", () => {
    const editor = fixture(), request = captureMsfeFlowchartRequest(editor, { from: 8, to: 8 + source.length }, flow)!;
    editor.commands.insertText("prefix "); const before = editor.getMarkdown();
    expect(request.commit(prepareFlowchartSave(flow, { ...preview, source: serializeFlowchart(flow.document) }))).toBe("saved"); request.release();
    expect(editor.getMarkdown()).toContain('"revision":1');
    editor.undo(); expect(editor.getMarkdown()).toBe(before); editor.redo(); expect(editor.getMarkdown()).toContain('"revision":1');
  });
  it("refuses source changes, readonly and document replacement", () => {
    const editor = fixture(), range = { from: 8, to: 8 + source.length };
    const request = captureMsfeFlowchartRequest(editor, range, flow)!;
    const next = prepareFlowchartSave(flow, { ...preview, source: serializeFlowchart(flow.document) });
    editor.setReadOnly(true); expect(request.commit(next)).toBe("readonly"); editor.setReadOnly(false);
    editor.applyChanges({ documentId: editor.documentId, baseRevision: editor.revision, changes: { from: 35, insert: "x" } });
    expect(request.commit(next)).toBe("conflict");
    editor.replaceDocument("replacement", "new"); expect(request.commit(next)).toBe("missing"); request.release();
  });
  it("cancels without a source change or a history item", () => {
    const editor = fixture(), before = editor.getMarkdown();
    const request = captureMsfeFlowchartRequest(editor, { from: 0, to: 0 })!; request.release();
    expect(editor.getMarkdown()).toBe(before); expect(editor.history.canUndo).toBe(false);
  });
  it("inserts beside a code fence without replacing its source", () => {
    const editor = fixture(), original = '```ts\nconst x = 1;\n```';
    editor.replaceDocument(original, "code");
    const request = captureMsfeFlowchartRequest(editor, { from: 12, to: 12 })!;
    expect(request.commit(prepareFlowchartSave(request.document, { ...preview, source: serializeFlowchart(request.document.document) }))).toBe("saved"); request.release();
    expect(editor.getMarkdown().startsWith(`${original}\n\n`)).toBe(true);
    expect(editor.querySource("flowchart", { from: 0, to: editor.state.doc.length }).matches).toHaveLength(1);
    editor.undo(); expect(editor.getMarkdown()).toBe(original);
  });
  it.each([
    { markdown: "before\n\n\n", position: 9, before: true },
    { markdown: "before\n\n\nafter", position: 8, before: true },
    { markdown: "\n\n# Heading", position: 0, before: false },
  ])("inserts from whitespace at $position without losing neighboring source", ({ markdown, position, before }) => {
    const editor = fixture(); editor.replaceDocument(markdown, "whitespace");
    const request = captureMsfeFlowchartRequest(editor, { from: position, to: position });
    expect(request).not.toBeNull();
    expect(request!.commit(prepareFlowchartSave(request!.document, { ...preview, source: serializeFlowchart(request!.document.document) }))).toBe("saved");
    request!.release();
    const result = editor.getMarkdown();
    expect(result.includes("before") ? result.indexOf("before") < result.indexOf("quirekit-flowchart") : false).toBe(before);
    if (!before) expect(result.indexOf("# Heading")).toBeGreaterThan(result.indexOf("quirekit-flowchart"));
    editor.undo(); expect(editor.getMarkdown()).toBe(markdown);
  });
  it("does not interpret whitespace inside an unfinished fence as an insertion gap", () => {
    const editor = fixture(), markdown = "```ts\nconst x = 1;\n\n";
    editor.replaceDocument(markdown, "unfinished");
    expect(captureMsfeFlowchartRequest(editor, { from: markdown.length, to: markdown.length })).toBeNull();
  });
  it("refuses mismatched caller data and makes insertion tasks single-use", () => {
    const editor = fixture();
    expect(captureMsfeFlowchartRequest(editor, { from: 8, to: 8 + source.length }, { ...flow, id: "other" })).toBeNull();
    const request = captureMsfeFlowchartRequest(editor, { from: 0, to: 0 })!;
    const saved = prepareFlowchartSave(request.document, { ...preview, source: serializeFlowchart(request.document.document) });
    expect(request.commit(saved)).toBe("saved"); const before = editor.getMarkdown();
    expect(request.commit(saved)).toBe("missing"); expect(editor.getMarkdown()).toBe(before); request.release();
  });
  it("sizes a wide saved preview by its aspect ratio instead of letterboxing it", () => {
    const dom = document.body.appendChild(document.createElement("div"));
    const wide = { ...flow, preview: { ...preview, width: 2260, height: 320 } };
    flowchartPreview(fixture(), null)({ dom, props: { flow: wide, range: { from: 8, to: 8 + source.length }, readOnly: true }, host: undefined, scope: undefined as never, requestMeasure() {} });
    const image = dom.querySelector("img")!;
    expect(image.style.height).toBe("auto"); expect(image.style.width).toBe("auto");
  });
});
