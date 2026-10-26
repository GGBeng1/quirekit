import { createEditor, Node, type CommandProps } from "@quirekit/core";
import { undoDepth } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { BlockInteraction } from "./extension";
import { readBlockCatalog } from "./identity";
import { UndoRedo } from "../undo-redo";

/** @param empty - Whether the middle paragraph is empty. @returns Isolated structural editor and insertion target. */
function setup(empty = false) {
  const editor = createEditor({ extensions: [
    Node.create({ name: "doc", topNode: true, content: "block+" }),
    Node.create({ name: "paragraph", group: "block", content: "inline*" }),
    Node.create({ name: "text", group: "inline" }), BlockInteraction, UndoRedo
  ], content: { type: "doc", content: ["A", empty ? "" : "B", "C"].map(text => ({ type: "paragraph", content: text ? [{ type: "text", text }] : [] })) } });
  const catalog = readBlockCatalog(editor)!;
  return { editor, destination: { target: catalog.blocks[1]!, side: "before" as const, expectedDocumentRevision: catalog.revision } };
}

describe("atomic block insertion initialization", () => {
  it("runs feature commands in the new paragraph and preserves unrelated selection content", () => {
    const { editor, destination } = setup(), before = editor.state.doc;
    editor.commands.setTextSelection({ from: 1, to: 8 });
    const request = { destination, initialize: ({ commands }: CommandProps) => commands.insertContent("New") };
    expect(editor.can().insertBlockAt(request)).toBe(true);
    expect(editor.state.doc).toBe(before);
    expect(editor.commands.insertBlockAt(request)).toBe(true);
    expect(editor.state.doc.content.content.map(node => node.textContent)).toEqual(["A", "New", "B", "C"]);
    expect(undoDepth(editor.state.pm)).toBe(1);
    editor.commands.undo(); expect(editor.state.doc.eq(before)).toBe(true);
    editor.destroy();
  });
  it("reuses only an empty ordinary paragraph and rejects a partially applied initializer", () => {
    const { editor, destination } = setup(true), before = editor.state.doc;
    const rejected = { destination, replaceEmpty: true, initialize: ({ commands }: CommandProps) => { commands.insertContent("Partial"); return false; } };
    expect(editor.can().insertBlockAt(rejected)).toBe(false);
    expect(editor.commands.insertBlockAt(rejected)).toBe(false);
    expect(editor.state.doc).toBe(before);
    expect(undoDepth(editor.state.pm)).toBe(0);
    expect(editor.commands.insertBlockAt({ destination, replaceEmpty: true, initialize: ({ commands }) => commands.insertContent("New") })).toBe(true);
    expect(editor.state.doc.content.content.map(node => node.textContent)).toEqual(["A", "New", "C"]);
    editor.commands.undo(); expect(editor.state.doc.eq(before)).toBe(true);
    editor.destroy();
  });
});
