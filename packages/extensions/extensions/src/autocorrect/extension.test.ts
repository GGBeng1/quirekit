import { createEditor, Node, type QuireEditor } from "@quirekit/core";
import type { EditorView, Transaction } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { AutoCorrect } from "./extension";
import { findAutoCorrectReplacement, findSentenceCapitalization } from "./match";
import { defaultAutoCorrectEntries } from "./defaults";
import type { AutoCorrectSettings } from "./types";

const Document = Node.create({ name: "doc", topNode: true, content: "block+" });
const Paragraph = Node.create({ name: "paragraph", group: "block", content: "inline*" });
const Text = Node.create({ name: "text", group: "inline" });

/** @param editor - Editor. @returns Minimal view driving plugin props. */
function viewOf(editor: QuireEditor): EditorView {
  return {
    get state() { return editor.state.pm; },
    dispatch(transaction: Transaction) { editor.dispatchTransaction(transaction); },
    editable: true
  } as unknown as EditorView;
}

/**
 * Types text one character at a time, letting input rules act as a browser would.
 *
 * @param editor - Editor.
 * @param text - Characters to type at the caret.
 */
function type(editor: QuireEditor, text: string): void {
  for (const character of text) {
    const { from, to } = editor.state.pm.selection;
    const handled = editor.state.pm.plugins.some(plugin => plugin.props.handleTextInput?.call(plugin, viewOf(editor), from, to, character));
    if (!handled) editor.commands.insertContent(character);
  }
}

/** @returns Editor with one empty paragraph and AutoCorrect. */
function createAutoCorrectEditor(): QuireEditor {
  const editor = createEditor({ extensions: [Document, Paragraph, Text, AutoCorrect], content: { type: "doc", content: [{ type: "paragraph" }] } });
  editor.commands.setTextSelection(1);
  return editor;
}

describe("AutoCorrect matching", () => {
  it("finds the longest table entry at a word start", () => {
    expect(findAutoCorrectReplacement("see (c)", defaultAutoCorrectEntries)).toEqual({ length: 3, replacement: "©" });
    expect(findAutoCorrectReplacement("(TM)", defaultAutoCorrectEntries)).toEqual({ length: 4, replacement: "™" });
    expect(findAutoCorrectReplacement("go -->", defaultAutoCorrectEntries)).toEqual({ length: 3, replacement: "→" });
    expect(findAutoCorrectReplacement("x:-)", defaultAutoCorrectEntries)).toEqual({ length: 3, replacement: "☺" });
    expect(findAutoCorrectReplacement("abc", [{ from: "bc", to: "X" }])).toBeNull();
    expect(findAutoCorrectReplacement("一如即往", [{ from: "一如即往", to: "一如既往" }])).toEqual({ length: 4, replacement: "一如既往" });
  });

  it("capitalizes only sentence starts", () => {
    const exceptions = new Set(["e.g."]);
    expect(findSentenceCapitalization("hello ", exceptions)).toEqual({ length: 6, replacement: "Hello " });
    expect(findSentenceCapitalization("Done. next,", exceptions)).toEqual({ length: 5, replacement: "Next," });
    expect(findSentenceCapitalization("完成。next ", exceptions)).toEqual({ length: 5, replacement: "Next " });
    expect(findSentenceCapitalization("see e.g. this ", exceptions)).toBeNull();
    expect(findSentenceCapitalization("one two ", exceptions)).toBeNull();
    expect(findSentenceCapitalization("iPhone ", exceptions)).toBeNull();
    expect(findSentenceCapitalization("a.", exceptions)).toBeNull();
    expect(findSentenceCapitalization("3.5 ", exceptions)).toBeNull();
  });
});

describe("AutoCorrect while typing", () => {
  it("replaces as you type and Backspace right after restores the typed text", () => {
    const editor = createAutoCorrectEditor();
    type(editor, "Note (c)");
    expect(editor.state.doc.textContent).toBe("Note ©");
    expect(editor.commands.undoInputRule()).toBe(true);
    expect(editor.state.doc.textContent).toBe("Note (c)");
    type(editor, " a --> b");
    expect(editor.state.doc.textContent).toBe("Note (c) a → b");
    editor.destroy();
  });

  it("capitalizes the first word of each sentence", () => {
    const editor = createAutoCorrectEditor();
    type(editor, "hello world. this is");
    expect(editor.state.doc.textContent).toBe("Hello world. This is");
    editor.destroy();
  });

  it("follows the settings", () => {
    const editor = createAutoCorrectEditor();
    const settings: AutoCorrectSettings = { replaceText: false, capitalizeSentences: false, entries: [{ from: "qk", to: "QuireKit" }] };
    expect(editor.commands.setAutoCorrectSettings(settings)).toBe(true);
    type(editor, "hello (c) ");
    expect(editor.state.doc.textContent).toBe("hello (c) ");
    editor.commands.setAutoCorrectSettings({ ...settings, replaceText: true });
    type(editor, "x qk");
    expect(editor.state.doc.textContent).toBe("hello (c) x QuireKit");
    editor.destroy();
  });
});
