import { QuireEditor, type QuireJSONContent } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import type { EditorView, Transaction } from "@quirekit/pm";
import { afterEach, describe, expect, it } from "vitest";
import { WordParagraph } from "../extension";

const editors: QuireEditor[] = [];
afterEach(() => editors.splice(0).forEach(editor => editor.destroy()));

describe("insertWordColumnBreak", () => {
  it("declares a column inline break distinct from page and line breaks", () => {
    const editor = createEditor();
    expect(editor.state.schema.nodes.wordColumnBreak!.spec.quireInlineBreak).toBe("column");
    expect(editor.state.schema.nodes.wordPageBreak!.spec.quireInlineBreak).toBe("page");
  });

  it("inserts one atom in one undoable transaction", () => {
    const editor = createEditor();
    const before = editor.getJSON();
    editor.commands.setTextSelection(3);

    expect(editor.commands.insertWordColumnBreak()).toBe(true);
    expect(editor.state.doc.nodeAt(3)?.type.name).toBe("wordColumnBreak");
    expect(editor.state.doc.textContent).toBe("alpha");
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(before);
  });

  it("binds Mod-Shift-Enter to the column break", () => {
    const editor = createEditor();
    editor.commands.setTextSelection(6);

    expect(dispatchShortcut(editor)).toBe(true);
    expect(editor.state.doc.nodeAt(6)?.type.name).toBe("wordColumnBreak");
  });
});

/** @param editor - Editor receiving the shortcut. @returns Whether a keymap handled it. */
function dispatchShortcut(editor: QuireEditor): boolean {
  const view = { get state() { return editor.state.pm; },
    dispatch(transaction: Transaction): void { editor.dispatchTransaction(transaction); }
  } as EditorView;
  const useMeta = /Mac|iP(hone|[oa]d)/.test(globalThis.navigator?.platform ?? "");
  const event = { key: "Enter", keyCode: 13, ctrlKey: !useMeta, metaKey: useMeta,
    shiftKey: true, altKey: false } as KeyboardEvent;
  return editor.state.pm.plugins.some(plugin =>
    plugin.props.handleKeyDown?.call(plugin, view, event));
}

/** @returns Managed one-paragraph editor. */
function createEditor(): QuireEditor {
  const content: QuireJSONContent = { type: "paragraph", content: [{ type: "text", text: "alpha" }] };
  const editor = new QuireEditor({ extensions: [StarterKit, WordParagraph], content: { type: "doc", content: [content] } });
  editors.push(editor);
  return editor;
}
