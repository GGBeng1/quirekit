// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { serializeMindMap, createMindMapEmbed, prepareMindMapSave } from "@quirekit/mind-map";
import { MsfeMindMap } from "./extension";
import { mindMapPreview } from "./renderer";
import { mindMapMarkdown } from "./source";
import { captureMsfeMindMapRequest } from "./session";
const mind = createMindMapEmbed("source-mind"), source = mindMapMarkdown(mind);
const editors: MsfeEditor[] = [];
const preview = { dataUrl: "data:image/png;base64,AAAA", width: 1, height: 1 };
/** @returns Independent Markdown owner. */
function fixture(): MsfeEditor {
  const parent = document.body.appendChild(document.createElement("div"));
  const editor = createMsfeEditor({ parent, markdown: `before\n\n${source}\n\nafter`, extensions: [MsfeMindMap] });
  editors.push(editor); return editor;
}
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });
describe("source-owned mindMaps", () => {
  it("decodes valid fences and keeps unknown versions as source", () => {
    const editor = fixture();
    expect(editor.querySource("mindMap", { from: 0, to: editor.state.doc.length }).matches).toHaveLength(1);
    expect(editor.querySource("mindMap", { from: 0, to: editor.state.doc.length }).matches[0]!.attrs.mind).toEqual(mind);
    editor.replaceDocument(source.replace('"version":1', '"version":99'), "other");
    expect(editor.querySource("mindMap", { from: 0, to: editor.state.doc.length }).matches).toHaveLength(0);
  });
  it("maps earlier text and makes a save one history event", () => {
    const editor = fixture(), request = captureMsfeMindMapRequest(editor, { from: 8, to: 8 + source.length }, mind)!;
    editor.commands.insertText("prefix "); const before = editor.getMarkdown();
    expect(request.commit(prepareMindMapSave(mind, { ...preview, source: serializeMindMap(mind.document) }))).toBe("saved"); request.release();
    expect(editor.getMarkdown()).toContain('"revision":1');
    editor.undo(); expect(editor.getMarkdown()).toBe(before); editor.redo(); expect(editor.getMarkdown()).toContain('"revision":1');
  });
  it("refuses source changes, readonly and document replacement", () => {
    const editor = fixture(), range = { from: 8, to: 8 + source.length };
    const request = captureMsfeMindMapRequest(editor, range, mind)!;
    const next = prepareMindMapSave(mind, { ...preview, source: serializeMindMap(mind.document) });
    editor.setReadOnly(true); expect(request.commit(next)).toBe("readonly"); editor.setReadOnly(false);
    editor.applyChanges({ documentId: editor.documentId, baseRevision: editor.revision, changes: { from: 35, insert: "x" } });
    expect(request.commit(next)).toBe("conflict");
    editor.replaceDocument("replacement", "new"); expect(request.commit(next)).toBe("missing"); request.release();
  });
  it("cancels without a source change or a history item", () => {
    const editor = fixture(), before = editor.getMarkdown();
    const request = captureMsfeMindMapRequest(editor, { from: 0, to: 0 })!; request.release();
    expect(editor.getMarkdown()).toBe(before); expect(editor.history.canUndo).toBe(false);
  });
  it("inserts beside a code fence without replacing its source", () => {
    const editor = fixture(), original = '```ts\nconst x = 1;\n```';
    editor.replaceDocument(original, "code");
    const request = captureMsfeMindMapRequest(editor, { from: 12, to: 12 })!;
    expect(request.commit(prepareMindMapSave(request.document, { ...preview, source: serializeMindMap(request.document.document) }))).toBe("saved"); request.release();
    expect(editor.getMarkdown().startsWith(`${original}\n\n`)).toBe(true);
    expect(editor.querySource("mindMap", { from: 0, to: editor.state.doc.length }).matches).toHaveLength(1);
    editor.undo(); expect(editor.getMarkdown()).toBe(original);
  });
  it.each([
    { markdown: "before\n\n\n", position: 9, before: true },
    { markdown: "before\n\n\nafter", position: 8, before: true },
    { markdown: "\n\n# Heading", position: 0, before: false },
  ])("inserts from whitespace at $position without losing neighboring source", ({ markdown, position, before }) => {
    const editor = fixture(); editor.replaceDocument(markdown, "whitespace");
    const request = captureMsfeMindMapRequest(editor, { from: position, to: position });
    expect(request).not.toBeNull();
    expect(request!.commit(prepareMindMapSave(request!.document, { ...preview, source: serializeMindMap(request!.document.document) }))).toBe("saved");
    request!.release();
    const result = editor.getMarkdown();
    expect(result.includes("before") ? result.indexOf("before") < result.indexOf("quirekit-mind-map") : false).toBe(before);
    if (!before) expect(result.indexOf("# Heading")).toBeGreaterThan(result.indexOf("quirekit-mind-map"));
    editor.undo(); expect(editor.getMarkdown()).toBe(markdown);
  });
  it("does not interpret whitespace inside an unfinished fence as an insertion gap", () => {
    const editor = fixture(), markdown = "```ts\nconst x = 1;\n\n";
    editor.replaceDocument(markdown, "unfinished");
    expect(captureMsfeMindMapRequest(editor, { from: markdown.length, to: markdown.length })).toBeNull();
  });
  it("refuses mismatched caller data and makes insertion tasks single-use", () => {
    const editor = fixture();
    expect(captureMsfeMindMapRequest(editor, { from: 8, to: 8 + source.length }, { ...mind, id: "other" })).toBeNull();
    const request = captureMsfeMindMapRequest(editor, { from: 0, to: 0 })!;
    const saved = prepareMindMapSave(request.document, { ...preview, source: serializeMindMap(request.document.document) });
    expect(request.commit(saved)).toBe("saved"); const before = editor.getMarkdown();
    expect(request.commit(saved)).toBe("missing"); expect(editor.getMarkdown()).toBe(before); request.release();
  });
  it("sizes a wide saved preview by its aspect ratio instead of letterboxing it", () => {
    const dom = document.body.appendChild(document.createElement("div"));
    const wide = { ...mind, preview: { ...preview, width: 2260, height: 320 } };
    mindMapPreview(fixture(), null)({ dom, props: { mind: wide, range: { from: 8, to: 8 + source.length }, readOnly: true }, host: undefined, scope: undefined as never, requestMeasure() {} });
    const image = dom.querySelector("img")!;
    expect(image.style.height).toBe("auto"); expect(image.style.width).toBe("auto");
  });
});
