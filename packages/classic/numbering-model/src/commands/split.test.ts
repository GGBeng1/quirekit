import { QuireEditor } from "@quirekit/core";
import { closeHistory } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { WordParagraph } from "@quirekit/classic-paragraph-model";
import { describe, expect, it } from "vitest";
import { WordNumbering } from "../extension";
import { resolveWordNumberingMarkers } from "../resolver";

/** @returns Editor with a single splittable paragraph. */
function createEditor(): QuireEditor {
  return new QuireEditor({
    extensions: [StarterKit, WordParagraph, WordNumbering],
    content: { type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "abcd" }] }
    ] }
  });
}

describe("Word list splitting", () => {
  it.each([1, 3, 5])("continues an explicit start when splitting at %i", (position) => {
    const editor = createEditor();
    editor.commands.toggleWordOrderedList({ start: 4 });
    editor.commands.setTextSelection(position);
    editor.dispatchTransaction(closeHistory(editor.state.pm.tr));
    const before = editor.state.doc;
    expect(editor.can().splitBlock()).toBe(true);
    expect(editor.state.doc).toBe(before);
    let transactions = 0;
    editor.on("transaction", () => { transactions += 1; });
    expect(editor.commands.splitBlock()).toBe(true);
    expect(transactions).toBe(1);
    expect(editor.state.doc.child(0).attrs.wordNumbering.startOverride).toBe(4);
    expect(editor.state.doc.child(1).attrs.wordNumbering.startOverride).toBeNull();
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()].map(m => m.text))
      .toEqual(["4.", "5."]);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc).toEqual(before);
    expect(editor.commands.redo()).toBe(true);
    expect(editor.state.doc.child(1).attrs.wordNumbering.startOverride).toBeNull();
    editor.destroy();
  });

  it.each([1, 3, 5])("creates an unchecked task at %i without altering the completed item", (position) => {
    const editor = createEditor();
    editor.commands.toggleWordTaskList({ checked: true });
    editor.commands.setTextSelection(position);
    expect(editor.commands.splitBlock()).toBe(true);
    expect(editor.state.doc.child(0).attrs.wordNumbering.task.checked).toBe(true);
    expect(editor.state.doc.child(1).attrs.wordNumbering.task.checked).toBe(false);
    editor.destroy();
  });

  it("keeps direct indentation, level, instance and text through a range split chain", () => {
    const editor = createEditor();
    editor.commands.toggleWordOrderedList({ start: 7 });
    editor.commands.increaseWordListLevel();
    editor.commands.setTextSelection({ from: 2, to: 4 });
    const reference = editor.state.doc.firstChild!.attrs.wordNumbering;
    expect(editor.chain().splitBlock().insertContent("z").run()).toBe(true);
    expect(editor.state.doc.child(0).textContent).toBe("a");
    expect(editor.state.doc.child(1).textContent).toBe("zd");
    expect(editor.state.doc.child(1).attrs.wordNumbering).toEqual({
      ...reference, startOverride: null
    });
    editor.destroy();
  });
});
