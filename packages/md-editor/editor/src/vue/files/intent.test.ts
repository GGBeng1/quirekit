// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { EditorSelection } from "@quirekit/cm-state";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { createFileIntent, commitFileImport } from "./intent";

const editors: MsfeEditor[] = [];
/** @param markdown - Initial source. @returns A mounted source owner with ordinary history. */
function mount(markdown = "Original"): MsfeEditor {
  const parent = document.createElement("div");
  document.body.append(parent);
  const editor = createMsfeEditor({ parent, markdown, documentId: "document" });
  editors.push(editor);
  return editor;
}
afterEach(() => { for (const editor of editors.splice(0)) editor.destroy(); document.body.replaceChildren(); });

describe("explicit file import intents", () => {
  it("appends at the end even when the captured selection is in the middle", () => {
    const editor = mount();
    editor.setSelection(EditorSelection.single(2, 4));
    const intent = createFileIntent(editor, "markdownImport")!;
    expect(commitFileImport(editor, intent, "## Imported\n", "append")).toBe(true);
    expect(editor.getMarkdown()).toBe("Original\n\n## Imported\n");
    intent.anchor?.release();
  });
  it("replaces the entire source rather than the selected range", () => {
    const editor = mount();
    editor.setSelection(EditorSelection.single(2));
    const intent = createFileIntent(editor, "wordImport")!;
    expect(commitFileImport(editor, intent, "# Replacement\n", "replace")).toBe(true);
    expect(editor.getMarkdown()).toBe("# Replacement\n");
    intent.anchor?.release();
  });
  it("blocks overwriting changes made while the draft was open, including boundary insertions", () => {
    for (const position of [0, 8]) {
      const editor = mount(), intent = createFileIntent(editor, "wordImport")!;
      editor.run(() => ({ changes: { from: position, insert: "new" } }));
      expect(commitFileImport(editor, intent, "Imported", "replace")).toBe(false);
      expect(editor.getMarkdown()).toContain("new");
      intent.anchor?.release();
    }
  });
  it("rejects stale generations, read-only state and empty drafts without modifying source", () => {
    const editor = mount(), intent = createFileIntent(editor, "markdownImport")!;
    expect(commitFileImport(editor, intent, "  ", "replace")).toBe(false);
    editor.setReadOnly(true);
    expect(commitFileImport(editor, intent, "Imported", "append")).toBe(false);
    expect(createFileIntent(editor, "wordImport")).toBeNull();
    expect(createFileIntent(editor, "wordExport")?.markdown).toBe("Original");
    const pdf = createFileIntent(editor, 'formatExport')!;
    expect(pdf.markdown).toBe('Original'); expect(pdf.anchor).toBeNull();
    editor.setReadOnly(false);
    editor.replaceDocument("New document", "document");
    expect(pdf.markdown).toBe('Original');
    expect(commitFileImport(editor, intent, "Imported", "append")).toBe(false);
    expect(editor.getMarkdown()).toBe("New document");
    intent.anchor?.release();
  });
  it("does not pad empty documents or an existing blank-line boundary", () => {
    for (const original of ["", "Original\n", "Original\n\n"]) {
      const editor = mount(original), intent = createFileIntent(editor, "markdownImport")!;
      expect(commitFileImport(editor, intent, "Imported", "append")).toBe(true);
      expect(editor.getMarkdown()).toBe(original ? "Original\n\nImported" : "Imported");
      intent.anchor?.release();
    }
  });
});
