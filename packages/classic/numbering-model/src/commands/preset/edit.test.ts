import { QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { WordParagraph } from "@quirekit/classic-paragraph-model";
import { describe, expect, it } from "vitest";
import { WordNumbering } from "../../extension";
import { readWordNumberingEditTarget } from "../../selection";
import { resolveWordNumberingMarkers } from "../../resolver";
import { createDefaultWordNumberingRegistry } from "../../model";
import { closeHistory } from "@quirekit/pm";

/** @returns Two concrete sequences sharing one immutable abstract definition. */
function sharedEditor(): QuireEditor {
  const registry = createDefaultWordNumberingRegistry();
  return new QuireEditor({ extensions: [StarterKit, WordParagraph, WordNumbering], content: {
    type: "doc", attrs: { wordNumberingRegistry: { ...registry, nums: {
      a: { id: "a", abstractNumId: "quirekit-decimal" }, b: { id: "b", abstractNumId: "quirekit-decimal" }
    } } }, content: ["a", "b", "b"].map((numId, index) => ({ type: "paragraph",
      attrs: { wordNumbering: { numId, level: 0, startOverride: null, task: null } },
      content: [{ type: "text", text: String(index) }]
    }))
  } });
}

/** @returns Two paragraphs available for independent sequences. */
function createEditor(): QuireEditor {
  return new QuireEditor({ extensions: [StarterKit, WordParagraph, WordNumbering], content: {
    type: "doc", content: ["first", "second"].map(text => ({ type: "paragraph", content: [{ type: "text", text }] }))
  } });
}

describe("editing concrete numbering definitions", () => {
  it("isolates shared definitions and restores the whole edit in one undo", () => {
    const editor = sharedEditor();
    const target = readWordNumberingEditTarget(editor.state)!;
    const before = editor.state.doc;
    editor.dispatchTransaction(closeHistory(editor.state.pm.tr));
    expect(editor.commands.updateWordNumberingDefinition({ target, levels: [{ level: 0, text: "[%1]" }] })).toBe(true);
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()].map(marker => marker.text)).toEqual(["[1]", "1.", "2."]);
    expect(editor.state.doc.attrs.wordNumberingRegistry.nums.b.abstractNumId).toBe("quirekit-decimal");
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc).toEqual(before);
    expect(editor.commands.redo()).toBe(true);
    const current = readWordNumberingEditTarget(editor.state)!;
    const unchanged = editor.state.doc;
    expect(editor.commands.updateWordNumberingDefinition({ target: current, levels: [{ level: 0, start: -1 }] })).toBe(false);
    expect(editor.commands.updateWordNumberingDefinition({ target: current, levels: [{ level: 0, text: "[%1]" }] })).toBe(false);
    expect(editor.state.doc).toBe(unchanged);
    editor.destroy();
  });

  it("relinks the whole independent sequence tail when continuing from selection", () => {
    const editor = sharedEditor();
    editor.commands.setTextSelection(4);
    const before = editor.state.doc;
    expect(editor.can().continueWordNumbering()).toBe(true);
    expect(editor.state.doc).toBe(before);
    expect(editor.commands.continueWordNumbering()).toBe(true);
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()].map(marker => marker.text)).toEqual(["1.", "2.", "3."]);
    expect(editor.state.doc.child(2).attrs.wordNumbering.numId).toBe("a");
    editor.destroy();
  });
  it("continues the transaction-local restart within one command chain", () => {
    const editor = sharedEditor();
    editor.commands.setTextSelection(7);
    expect(editor.chain().restartWordNumbering({ start: 8 })
      .continueWordNumberingAtPosition({ position: 6 }).run()).toBe(true);
    expect(editor.state.doc.child(2).attrs.wordNumbering.startOverride).toBeNull();
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()].map(marker => marker.text)).toEqual(["1.", "1.", "2."]);
    editor.destroy();
  });

  it("reads the actual restart and tuple, updates once and rejects stale edits", () => {
    const editor = createEditor();
    editor.commands.toggleWordOrderedList({ start: 4 });
    const target = readWordNumberingEditTarget(editor.state)!;
    expect(target.reference.startOverride).toBe(4);
    const doc = editor.state.doc;
    const options = { target, levels: [{ level: 0, text: "[%1]", markerStyle: { color: "#123456" } }] };
    expect(editor.can().updateWordNumberingDefinition(options)).toBe(true);
    expect(editor.state.doc).toBe(doc);
    expect(editor.commands.updateWordNumberingDefinition(options)).toBe(true);
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()][0]?.text).toBe("[4]");
    const next = readWordNumberingEditTarget(editor.state)!;
    expect(next.reference.numId).not.toBe(target.reference.numId);
    expect(next.definition.levels["1"]).toEqual(target.definition.levels["1"]);
    expect(editor.commands.updateWordNumberingDefinition(options)).toBe(false);
    editor.destroy();
  });

  it("continues another concrete instance through the selection command", () => {
    const editor = createEditor();
    editor.commands.toggleWordOrderedList();
    editor.commands.setTextSelection(8);
    // An explicit restart creates the second paragraph in the same sequence;
    // both public continue entry points must clear that restart consistently.
    editor.commands.toggleWordOrderedList({ start: 8 });
    expect(editor.state.doc.child(1).attrs.wordNumbering.startOverride).toBe(8);
    expect(editor.commands.continueWordNumbering()).toBe(true);
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()].map(marker => marker.text)).toEqual(["1.", "2."]);
    editor.destroy();
  });
});
