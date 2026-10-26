import { createEditor, type QuireAnyExtension } from "@quirekit/core";
import { UndoRedo } from "@quirekit/extensions";
import { describe, expect, it } from "vitest";
import { createTextStyleTestExtensions } from "../testing/extensions";
import { Subscript, Superscript } from "./script-position";

/** @param marks - Installed script marks. @returns An isolated editable paragraph. */
function fixture(marks: readonly QuireAnyExtension[] = [Superscript, Subscript]) {
  return createEditor({
    extensions: [...createTextStyleTestExtensions(), UndoRedo, ...marks],
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "ABC" }] }] }
  });
}

describe("script-position authoring", () => {
  it.each([Superscript, Subscript])("installs $name independently and toggles it", mark => {
    const editor = fixture([mark]);
    editor.commands.setTextSelection({ from: 1, to: 3 });
    const toggle = mark.name === "superscript" ? "toggleSuperscript" : "toggleSubscript";
    expect(editor.commands[toggle]()).toBe(true);
    expect(editor.isActive(mark.name)).toBe(true);
    expect(editor.commands[toggle]()).toBe(true);
    expect(editor.isActive(mark.name)).toBe(false);
    editor.destroy();
  });

  it("uses pending transaction state for repeated and opposite toggles", () => {
    const editor = fixture();
    expect(editor.chain().setTextSelection({ from: 1, to: 3 })
      .setSuperscript().toggleSuperscript().run()).toBe(true);
    expect(editor.isActive("superscript")).toBe(false);
    expect(editor.chain().setSubscript().toggleSuperscript().toggleSuperscript().run()).toBe(true);
    expect(editor.isActive("superscript")).toBe(false);
    expect(editor.isActive("subscript")).toBe(false);
    editor.destroy();
  });

  it("dispatches shortcuts in the keymap transaction for selected and future text", () => {
    const editor = fixture();
    for (const selection of [4, { from: 1, to: 3 }]) {
      editor.commands.setTextSelection(selection);
      for (const [key, name] of [[".", "superscript"], [",", "subscript"], [",", null]] as const) {
        const mac = typeof navigator !== "undefined" && /Mac|iP(hone|[oa]d)/.test(navigator.platform);
        const event = { key, keyCode: key === "." ? 190 : 188, metaKey: mac, ctrlKey: !mac } as KeyboardEvent;
        expect(editor.view.someProp("handleKeyDown", handler => handler(editor.view, event))).toBe(true);
        expect(editor.isActive("superscript")).toBe(name === "superscript");
        expect(editor.isActive("subscript")).toBe(name === "subscript");
      }
    }
    editor.destroy();
  });

  it("normalizes mixed selections without removing other character formatting", () => {
    const editor = fixture();
    editor.chain().setTextSelection({ from: 1, to: 2 }).setSuperscript().run();
    editor.chain().setTextSelection({ from: 2, to: 3 }).setSubscript().run();
    editor.chain().setTextSelection({ from: 1, to: 4 }).setMark("bold").run();
    expect(editor.isActive("superscript")).toBe(false);
    const before = editor.getJSON();
    expect(editor.can().toggleSuperscript()).toBe(true);
    expect(editor.getJSON()).toEqual(before);
    expect(editor.commands.toggleSuperscript()).toBe(true);
    expect(editor.isActive("superscript")).toBe(true);
    expect(editor.isActive("subscript")).toBe(false);
    expect(editor.isActive("bold")).toBe(true);
    const changed = editor.getJSON();
    expect(editor.commands.undo()).toBe(true);
    expect(editor.commands.redo()).toBe(true);
    expect(editor.getJSON()).toEqual(changed);
    editor.commands.toggleSuperscript();
    expect(editor.isActive("superscript")).toBe(false);
    expect(editor.isActive("bold")).toBe(true);
    editor.destroy();
  });

  it("switches stored marks while typing and returns to normal text", () => {
    const editor = fixture();
    editor.commands.setTextSelection(4);
    editor.commands.toggleSuperscript();
    editor.commands.insertContent("2");
    editor.commands.toggleSubscript();
    editor.commands.insertContent("3");
    editor.commands.toggleSubscript();
    editor.commands.insertContent("D");
    expect(editor.getJSON().content?.[0]?.content).toEqual([
      { type: "text", text: "ABC" },
      { type: "text", text: "2", marks: [{ type: "superscript" }] },
      { type: "text", text: "3", marks: [{ type: "subscript" }] },
      { type: "text", text: "D" }
    ]);
    editor.destroy();
  });
});
