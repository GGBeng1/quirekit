import { Node, QuireEditor, type QuireJSONContent } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import type { EditorView, Transaction } from "@quirekit/pm";
import { afterEach, describe, expect, it } from "vitest";
import { WordParagraph } from "../extension";

const editors: QuireEditor[] = [];
afterEach(() => editors.splice(0).forEach(editor => editor.destroy()));

describe("insertWordPageBreak", () => {
  it("does not silently turn the page shortcut into a line break in an unsupported story", () => {
    const editor = new QuireEditor({ extensions: [StarterKit, WordParagraph,
      Node.create({ name: "wordStory", group: "block", content: "paragraph+" })],
      content: { type: "doc", content: [{ type: "wordStory", content: [{ type: "paragraph",
        content: [{ type: "text", text: "header" }] }] }] } });
    editors.push(editor);
    editor.commands.setTextSelection(3);
    const source = editor.getJSON();
    expect(editor.can().insertWordPageBreak()).toBe(false);
    expect(dispatchPageShortcut(editor)).toBe(true);
    expect(editor.getJSON()).toEqual(source);
  });
  it("keeps page and line break schema identities separate", () => {
    const editor = createEditor();
    expect(editor.state.schema.nodes.wordPageBreak!.spec.quireInlineBreak).toBe("page");
    expect(editor.state.schema.nodes.hardBreak!.spec.quireInlineBreak).toBeUndefined();
    expect(editor.state.schema.nodes.text!.spec.quireInlineBreak).toBeUndefined();
    expect(editor.state.schema.nodes.paragraph!.spec.quireInlineBreak).toBeUndefined();
  });
  it.each([1, 3, 6])("inserts an independent inline break at position %s", position => {
    const editor = createEditor();
    editor.commands.setTextSelection(position);
    let transactions = 0;
    editor.on("transaction", () => { transactions += 1; });
    expect(editor.commands.insertWordPageBreak()).toBe(true);
    expect(transactions).toBe(1);
    expect(editor.state.doc.childCount).toBe(1);
    expect(editor.state.doc.textContent).toBe("alpha");
    expect(editor.state.doc.nodeAt(position)?.type.name).toBe("wordPageBreak");
    expect(editor.state.pm.selection.from).toBe(position + 1);
    expect(editor.state.doc.firstChild?.attrs.wordParagraph).toBeNull();
  });

  it("retains consecutive and trailing breaks and removes only the selected break", () => {
    const editor = createEditor();
    editor.commands.setTextSelection(6);
    editor.commands.insertWordPageBreak();
    editor.commands.insertWordPageBreak();
    expect(editor.state.doc.firstChild?.childCount).toBe(3);
    editor.commands.deleteRange({ from: 7, to: 8 });
    expect(editor.state.doc.nodeAt(6)?.type.name).toBe("wordPageBreak");
    expect(editor.state.doc.firstChild?.childCount).toBe(2);
    editor.commands.setTextSelection(6);
    editor.commands.splitBlock();
    expect(editor.state.doc.child(1).firstChild?.type.name).toBe("wordPageBreak");
  });

  it("replaces the selection in one undoable edit", () => {
    const editor = createEditor();
    const before = editor.getJSON();
    editor.commands.setTextSelection({ from: 2, to: 4 });
    expect(editor.commands.insertWordPageBreak()).toBe(true);
    expect(editor.state.doc.textContent).toBe("aha");
    expect(editor.state.doc.nodeAt(2)?.type.name).toBe("wordPageBreak");
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(before);
    expect(editor.commands.redo()).toBe(true);
    expect(editor.state.doc.nodeAt(2)?.type.name).toBe("wordPageBreak");
  });

  it("preserves the complete heading tuple and independent paragraph page policy", () => {
    const editor = createEditor({ type: "heading", attrs: {
      level: 2, wordParagraph: { styleId: "Heading2", pagination: {
        pageBreakBefore: true, keepNext: true, widowControl: true
      }, indentation: { start: { value: 240, unit: "dxa" } } }
    }, content: [{ type: "text", text: "title", marks: [{ type: "bold" }] }] });
    const attrs = editor.state.doc.firstChild!.attrs;
    editor.commands.setTextSelection(3);
    editor.commands.insertWordPageBreak();
    expect(editor.state.doc.firstChild!.type.name).toBe("heading");
    expect(editor.state.doc.firstChild!.attrs).toEqual(attrs);
    expect(editor.state.doc.nodeAt(3)?.marks.map(mark => mark.type.name)).toContain("bold");
  });

  it("supports dry runs and rejects node selections without changing the document", () => {
    const editor = createEditor();
    const before = editor.getJSON();
    editor.commands.setTextSelection(3);
    expect(editor.can().insertWordPageBreak()).toBe(true);
    expect(editor.getJSON()).toEqual(before);
    editor.commands.setNodeSelection(0);
    expect(editor.commands.insertWordPageBreak()).toBe(false);
    expect(editor.getJSON()).toEqual(before);
  });
});

/** @param editor - Editor under test. @returns Whether the real keymap consumes Mod+Enter. */
function dispatchPageShortcut(editor: QuireEditor): boolean {
  const view = { get state() { return editor.state.pm; },
    dispatch(transaction: Transaction): void { editor.dispatchTransaction(transaction); }
  } as EditorView;
  const useMeta = /Mac|iP(hone|[oa]d)/.test(globalThis.navigator?.platform ?? "");
  const event = { key: "Enter", keyCode: 13, ctrlKey: !useMeta, metaKey: useMeta,
    shiftKey: false, altKey: false } as KeyboardEvent;
  return editor.state.pm.plugins.some(plugin =>
    plugin.props.handleKeyDown?.call(plugin, view, event));
}

/** @param textblock - Source paragraph or heading. @returns Managed test editor. */
function createEditor(textblock: QuireJSONContent = {
  type: "paragraph", content: [{ type: "text", text: "alpha" }]
}): QuireEditor {
  const editor = new QuireEditor({ extensions: [StarterKit, WordParagraph],
    content: { type: "doc", content: [textblock] } });
  editors.push(editor);
  return editor;
}
