import { createEditor, Extension, textInputRule, type QuireEditor } from "@quirekit/core";
import { TextSelection } from "@quirekit/pm";
import { expect, it } from "vitest";
import { BulletList } from "../bullet-list";
import { ListItem } from "../item";
import { ListKeymap } from "./list-keymap";

/** @param editor - Source-keymap consumer. @returns Whether Backspace was consumed. */
function backspace(editor: QuireEditor): boolean {
  return editor.view.someProp("handleKeyDown", handler => handler(editor.view, { key: "Backspace", keyCode: 8 } as KeyboardEvent)) === true;
}

it("does not publish an empty input-rule transaction before a selection fallback", () => {
  const editor = createEditor({ extensions: [BulletList, ListItem, ListKeymap, Extension.create({ name: "selection-fallback", priority: 10,
    /** @returns Non-mutating fallback exercising the shared dispatch chain. */
    addKeyboardShortcuts() { return { Backspace: ({ tr, dispatch }) => { dispatch?.(tr.setSelection(TextSelection.create(tr.doc, 1, 3))); return true; } }; }
  })], content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "text" }] }] } });
  try {
    editor.commands.setTextSelection(3); let transactions = 0;
    editor.on("transaction", () => { transactions++; });
    expect(backspace(editor)).toBe(true);
    expect(transactions).toBe(1);
    expect([editor.state.pm.selection.from, editor.state.pm.selection.to]).toEqual([1, 3]);
    expect(editor.state.doc.textContent).toBe("text");
  } finally { editor.destroy(); }
});

it("still undoes an input rule in one transaction", () => {
  const editor = createEditor({ extensions: [BulletList, ListItem, ListKeymap, Extension.create({ name: "smart-dash",
    /** @returns Undoable rule used by the real keymap. */
    addInputRules() { return [textInputRule({ find: /--$/, replace: "—" })]; }
  })], content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "a-" }] }] } });
  try {
    editor.commands.setTextSelection(3);
    expect(editor.view.someProp("handleTextInput", handler => handler(editor.view, 3, 3, "-"))).toBe(true);
    expect(editor.state.doc.textContent).toBe("a—");
    let transactions = 0; editor.on("transaction", () => { transactions++; });
    expect(backspace(editor)).toBe(true); expect(editor.state.doc.textContent).toBe("a--");
    expect(transactions).toBe(1);
  } finally { editor.destroy(); }
});

it("joins adjacent list items in one transaction", () => {
  const editor = createEditor({ extensions: [BulletList, ListItem, ListKeymap], content: { type: "doc", content: [{ type: "bulletList", content:
    ["a", "b"].map(text => ({ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text }] }] }))
  }] } });
  try {
    let position = 0; editor.state.doc.descendants((node, pos) => { if (node.isTextblock && node.textContent === "b") position = pos + 1; });
    editor.commands.setTextSelection(position); let transactions = 0;
    editor.on("transaction", () => { transactions++; });
    expect(backspace(editor)).toBe(true);
    expect(editor.state.doc.firstChild!.childCount).toBe(1);
    expect(editor.state.doc.textContent).toBe("ab"); expect(transactions).toBe(1);
  } finally { editor.destroy(); }
});
