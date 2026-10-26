import { afterEach, describe, expect, it, vi } from "vitest";
import { highlightTree, classHighlighter } from "@lezer/highlight";
import { codeGrammars } from "./highlighting/grammars";
import type { DecorationSet } from "@quirekit/pm";
import { createBlockEditor } from "../runtime/create";
const sessions: ReturnType<typeof createBlockEditor>[] = [];
afterEach(() => { sessions.splice(0).forEach(session => session.destroy()); });
/** @returns A small document with two independently highlighted code blocks. */
function fixture() {
  const instance = createBlockEditor({ content: { type: "doc", content: [
    { type: "codeBlock", attrs: { language: "typescript" }, content: [{ type: "text", text: "const value = 42" }] },
    { type: "paragraph", content: [{ type: "text", text: "Notes" }] },
    { type: "codeBlock", attrs: { language: "json" }, content: [{ type: "text", text: '{"ready":true}' }] }
  ] } });
  sessions.push(instance); return instance.editor;
}
describe("Block code authoring", () => {
  it("provides real syntax coverage and reuses tokens for display and selection changes", () => {
    const snippets = { javascript: 'const x = "ok"', typescript: 'let x: number = 42', json: '{"x":true}', css: 'body { color: red; }', html: '<b class="x">hello</b>', python: 'def greet():\n    return "hello"', bash: 'echo "$HOME" # comment', sql: 'SELECT name FROM users WHERE id = 1', markdown: '# Heading\n**bold**' };
    for (const [language, source] of Object.entries(snippets)) {
      const spans: string[] = [];
      highlightTree(codeGrammars[language]!.parse(source), classHighlighter, (_from, _to, style) => spans.push(style));
      expect(spans.length, language).toBeGreaterThan(0);
    }
    const editor = fixture();
    editor.commands.setTextSelection(1);
    const parse = vi.spyOn(codeGrammars.typescript!, "parse");
    editor.commands.setBlockCodeDisplay({ position: 0, expected: { lineNumbers: false, wrap: false, height: null, theme: "auto" }, patch: { lineNumbers: true } });
    const highlight = editor.state.pm.plugins.find(plugin => (plugin.spec.key as { key?: string } | undefined)?.key?.startsWith("blockCodeHighlight"))!;
    expect((highlight.getState(editor.state.pm) as DecorationSet).find().filter(decoration => decoration.spec.key === "code-line:1")).toHaveLength(1);
    editor.commands.setTextSelection(2);
    expect(parse).not.toHaveBeenCalled();
    editor.commands.insertContent("x");
    expect(parse).toHaveBeenCalledTimes(1);
    parse.mockRestore();
    const python = vi.spyOn(codeGrammars.python!, "parse");
    editor.commands.setBlockCodeLanguage({ position: 0, expected: "typescript", language: "python" });
    expect(python).toHaveBeenCalledTimes(1);
    python.mockRestore();
  });
  it("persists display settings as one undoable source-bound change", () => {
    const editor = fixture(), before = editor.state.doc.firstChild!;
    const expected = { lineNumbers: false, wrap: false, height: null, theme: "auto" as const };
    expect(editor.commands.setBlockCodeDisplay({ position: 0, expected, patch: { lineNumbers: true, wrap: true, height: 240, theme: "dark" } })).toBe(true);
    expect(editor.state.doc.firstChild!.attrs).toMatchObject({ lineNumbers: true, wrap: true, height: 240, theme: "dark" });
    expect(editor.state.doc.firstChild!.textContent).toBe(before.textContent);
    expect(editor.commands.setBlockCodeDisplay({ position: 0, expected, patch: { height: 480 } })).toBe(false);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.firstChild!.attrs).toEqual(before.attrs);
    expect(editor.commands.setBlockCodeDisplay({ position: 0, expected, patch: { height: -1 } })).toBe(false);
    editor.setEditable(false);
    expect(editor.commands.setBlockCodeDisplay({ position: 0, expected, patch: { wrap: true } })).toBe(false);
  });
  it("keeps syntax presentation out of selection/history and maps unrelated changes", () => {
    const editor = fixture();
    // Settle canonical block identities before measuring a selection-only transaction.
    editor.commands.setTextSelection(1);
    const plugin = editor.state.pm.plugins.find(plugin => (plugin.spec.key as { key?: string } | undefined)?.key?.startsWith("blockCodeHighlight"))!;
    const before = plugin.getState(editor.state.pm) as DecorationSet;
    expect(before.find().length).toBeGreaterThan(3);
    editor.commands.setTextSelection(2);
    expect(plugin.getState(editor.state.pm)).toBe(before);
    const firstSize = editor.state.doc.firstChild!.nodeSize;
    editor.commands.insertContentAt(firstSize + 1, "More ");
    const after = plugin.getState(editor.state.pm) as DecorationSet;
    expect(after.find(0, firstSize)).toEqual(before.find(0, firstSize));
    expect(after.find().at(-1)!.from).toBe(before.find().at(-1)!.from + 5);
  });
  it("changes the captured language without changing source and undoes it separately", () => {
    const editor = fixture();
    editor.commands.setTextSelection(1); editor.commands.insertContent("// comment\n");
    const source = editor.state.doc.firstChild!.textContent;
    expect(editor.commands.setBlockCodeLanguage({ position: 0, expected: "typescript", language: "javascript" })).toBe(true);
    expect(editor.state.doc.firstChild!.textContent).toBe(source);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.firstChild!.attrs.language).toBe("typescript");
    expect(editor.state.doc.firstChild!.textContent).toBe(source);
    expect(editor.commands.setBlockCodeLanguage({ position: 0, expected: "javascript", language: "json" })).toBe(false);
    editor.setEditable(false);
    expect(editor.commands.setBlockCodeLanguage({ position: 0, expected: "typescript", language: "json" })).toBe(false);
  });
});
