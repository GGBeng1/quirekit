// @vitest-environment happy-dom
import { QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it, vi } from "vitest";
import { Link } from "../link";

/** @returns A focused URL at the end of a paragraph. */
function fixture(): QuireEditor {
  const editor = new QuireEditor({ extensions: [StarterKit, Link], content: "<p>https://example.com</p>" });
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);
  return editor;
}

/** @param editor - Fixture. @param text - Native input text. */
function type(editor: QuireEditor, text: string): void {
  const { from, to } = editor.state.pm.selection;
  const handled = editor.view.someProp("handleTextInput", fn => fn(editor.view, from, to, text));
  if (!handled) editor.view.dispatch(editor.state.pm.tr.insertText(text));
}

describe("completed typed URLs", () => {
  it("links on space without scanning the document or leaking the mark", () => {
    const editor = fixture();
    const scan = vi.spyOn(editor.state.doc, "descendants");
    type(editor, " ");
    expect(editor.state.doc.firstChild!.firstChild!.marks[0]?.attrs.href).toBe("https://example.com");
    expect(scan).not.toHaveBeenCalled();
    type(editor, "next");
    expect(editor.state.doc.firstChild!.lastChild!.marks).toEqual([]);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.textContent).toBe("https://example.com");
    expect(editor.state.doc.firstChild!.firstChild!.marks).toEqual([]);
    expect(editor.commands.redo()).toBe(true);
    expect(editor.state.doc.firstChild!.firstChild!.marks[0]?.type.name).toBe("link");
    editor.destroy();
  });
  it("preserves normal Enter splitting and links only the preceding URL", () => {
    const editor = fixture();
    editor.view.someProp("handleKeyDown", fn => fn(editor.view, new KeyboardEvent("keydown", { key: "Enter" })));
    expect(editor.state.doc.childCount).toBe(2);
    expect(editor.state.doc.firstChild!.firstChild!.marks[0]?.attrs.href).toBe("https://example.com");
    expect(editor.state.pm.selection.$from.parentOffset).toBe(0);
    type(editor, "next");
    expect(editor.state.doc.lastChild!.firstChild!.marks).toEqual([]);
    editor.destroy();
  });
  it("retains an input intent across declined commands that dispatch a no-op", async () => {
    const editor = fixture();
    const pos = editor.state.pm.selection.from;
    editor.view.someProp("handleTextInput", fn => fn(editor.view, pos, pos, " "));
    editor.view.dispatch(editor.state.pm.tr);
    editor.view.dispatch(editor.state.pm.tr.insertText(" "));
    expect(editor.state.doc.firstChild!.firstChild!.marks[0]?.attrs.href).toBe("https://example.com");
    editor.commands.setContent("<p>https://example.com</p>");
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    const next = editor.state.pm.selection.from;
    editor.view.someProp("handleTextInput", fn => fn(editor.view, next, next, " "));
    editor.view.dispatch(editor.state.pm.tr);
    await Promise.resolve();
    editor.view.dispatch(editor.state.pm.tr.insertText(" "));
    expect(editor.state.doc.firstChild!.firstChild!.marks).toEqual([]);
    editor.destroy();
  });
  it("never autolinks programmatic replacement, code, or existing links", () => {
    const editor = fixture();
    editor.commands.insertContent(" ");
    expect(editor.state.doc.firstChild!.firstChild!.marks).toEqual([]);
    editor.commands.setContent("<pre><code>https://example.com</code></pre>");
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    type(editor, " ");
    expect(editor.state.doc.firstChild!.firstChild!.marks).toEqual([]);
    editor.commands.setContent('<p><a href="https://original.com">https://example.com</a></p>');
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    type(editor, " ");
    expect(editor.state.doc.firstChild!.firstChild!.marks[0]?.attrs.href).toBe("https://original.com");
    editor.destroy();
  });
  it("expires canceled input before another task and respects the opt-out", async () => {
    const editor = fixture();
    const pos = editor.state.pm.selection.from;
    editor.view.someProp("handleTextInput", fn => fn(editor.view, pos, pos, " "));
    await Promise.resolve();
    editor.commands.insertContent(" ");
    expect(editor.state.doc.firstChild!.firstChild!.marks).toEqual([]);
    editor.destroy();
    const off = new QuireEditor({ extensions: [StarterKit, Link.configure({ autolink: false })], content: "<p>www.example.com</p>" });
    off.commands.setTextSelection(off.state.doc.content.size - 1);
    type(off, " ");
    expect(off.state.doc.firstChild!.firstChild!.marks).toEqual([]);
    off.destroy();
  });
  it("respects IME composition and rejects truncated long suffixes", () => {
    const editor = fixture();
    Object.defineProperty(editor.view, "composing", { value: true, configurable: true });
    type(editor, " ");
    expect(editor.state.doc.firstChild!.firstChild!.marks).toEqual([]);
    Reflect.deleteProperty(editor.view, "composing");
    editor.commands.setContent(`<p>https://example.com/${"x".repeat(2200)}</p>`);
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    type(editor, " ");
    expect(editor.state.doc.firstChild!.firstChild!.marks).toEqual([]);
    editor.destroy();
  });
});
