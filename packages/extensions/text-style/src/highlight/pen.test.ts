import { createEditor } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { createTextStyleTestExtensions } from "../testing/extensions";
import { Highlight } from "./highlight";
import { readHighlighterPenState } from "./pen";

/**
 * Creates an editor with one paragraph "Alpha Beta".
 *
 * @returns Editor with the highlight pen installed.
 */
function createPenEditor() {
  return createEditor({
    extensions: [...createTextStyleTestExtensions(), Highlight],
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Alpha Beta" }] }] }
  });
}

/**
 * Selects a range and ends the pointer gesture like the mounted view does.
 *
 * @param editor - Editor created by createPenEditor.
 * @param from - Selection start.
 * @param to - Selection end.
 */
function stroke(editor: ReturnType<typeof createPenEditor>, from: number, to: number): void {
  editor.commands.setTextSelection({ from, to });
  editor.view.dispatchEvent(new Event("pointerup"));
}

/**
 * Reads the text runs with their highlight colors.
 *
 * @param editor - Editor created by createPenEditor.
 * @returns Pairs of run text and highlight token or null.
 */
function readRuns(editor: ReturnType<typeof createPenEditor>) {
  return (editor.getJSON().content?.[0]?.content ?? []).map(node => [
    node.text,
    node.marks?.find(mark => mark.type === "highlight")?.attrs?.color ?? null
  ]);
}

describe("Highlighter pen", () => {
  it("paints each completed selection while the mode stays on", () => {
    const editor = createPenEditor();
    expect(editor.commands.startHighlighterPen("green")).toBe(true);
    expect(readHighlighterPenState(editor.state)).toEqual({ active: true, color: "green" });

    stroke(editor, 1, 6);
    stroke(editor, 7, 11);
    expect(readRuns(editor)).toEqual([["Alpha", "green"], [" ", null], ["Beta", "green"]]);
    expect(readHighlighterPenState(editor.state).active).toBe(true);
    editor.destroy();
  });

  it("does nothing while selecting is not complete or the selection is empty", () => {
    const editor = createPenEditor();
    editor.commands.startHighlighterPen("yellow");
    editor.commands.setTextSelection({ from: 1, to: 6 });
    expect(readRuns(editor)).toEqual([["Alpha Beta", null]]);
    stroke(editor, 3, 3);
    expect(readRuns(editor)).toEqual([["Alpha Beta", null]]);
    editor.destroy();
  });

  it("removes a uniform same-color highlight and erases with a null color", () => {
    const editor = createPenEditor();
    editor.commands.startHighlighterPen("yellow");
    stroke(editor, 1, 11);
    stroke(editor, 1, 6);
    expect(readRuns(editor)).toEqual([["Alpha", null], [" Beta", "yellow"]]);

    editor.commands.startHighlighterPen(null);
    stroke(editor, 1, 11);
    expect(readRuns(editor)).toEqual([["Alpha Beta", null]]);
    editor.destroy();
  });

  it("recolors mixed highlight to the pen color instead of removing it", () => {
    const editor = createPenEditor();
    editor.commands.setTextSelection({ from: 1, to: 6 });
    editor.commands.setHighlight({ color: "red" });
    editor.commands.startHighlighterPen("red");
    stroke(editor, 1, 11);
    expect(readRuns(editor)).toEqual([["Alpha Beta", "red"]]);
    editor.destroy();
  });

  it("stops on command, Escape-equivalent command and read-only editing without history", () => {
    const editor = createPenEditor();
    editor.commands.startHighlighterPen("yellow");
    expect(editor.commands.stopHighlighterPen()).toBe(true);
    expect(editor.commands.stopHighlighterPen()).toBe(false);

    editor.commands.startHighlighterPen("yellow");
    editor.setEditable(false);
    expect(readHighlighterPenState(editor.state).active).toBe(false);
    expect(editor.commands.startHighlighterPen("yellow")).toBe(false);
    editor.destroy();
  });
});
