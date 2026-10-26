import { describe, expect, it, vi } from "vitest";
import { NodeSelection } from "@quirekit/pm";
import {
  createEditor,
  Node
} from "../index";

describe("insertContentAt selected-node placement", () => {
  it("keeps an inline atom inside the text block and selects that atom", () => {
    const inlineAtom = Node.create({
      name: "inlineAtom",
      group: "inline",
      inline: true,
      atom: true
    });
    const richParagraph = Node.create({
      name: "paragraph",
      group: "block",
      content: "inline*"
    });
    const editor = createEditor({
      extensions: [richParagraph, inlineAtom],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "body" }]
        }]
      }
    });

    expect(editor.commands.setTextSelection(1)).toBe(true);
    expect(editor.commands.insertContentAt(
      1,
      editor.state.schema.nodes.inlineAtom!.create(),
      { selectInsertedNode: true }
    )).toBe(true);

    expect(editor.state.pm.selection).toBeInstanceOf(NodeSelection);
    expect(editor.state.pm.selection.toJSON()).toEqual({
      type: "node",
      anchor: 1
    });
    expect(editor.state.pm.doc.nodeAt(1)?.type.name).toBe("inlineAtom");
  });

  it("moves the selection to the inserted node end by default", () => {
    const inlineAtom = Node.create({
      name: "inlineAtom",
      group: "inline",
      inline: true,
      atom: true
    });
    const richParagraph = Node.create({
      name: "paragraph",
      group: "block",
      content: "inline*"
    });
    const editor = createEditor({
      extensions: [richParagraph, inlineAtom],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "body" }]
        }]
      }
    });

    expect(editor.commands.setTextSelection(1)).toBe(true);
    expect(editor.commands.insertContentAt(
      1,
      editor.state.schema.nodes.inlineAtom!.create()
    )).toBe(true);

    expect(editor.state.pm.selection.from).toBe(2);
    expect(editor.state.pm.doc.nodeAt(1)?.type.name).toBe("inlineAtom");
  });

  it("returns false for invalid JSON when strict content checking is requested", () => {
    const editor = createEditor();
    const before = editor.getJSON();

    expect(editor.commands.insertContentAt(
      1,
      { type: "missing-node" },
      { errorOnInvalidContent: true }
    )).toBe(false);
    expect(editor.getJSON()).toEqual(before);
  });

  it("ignores invalid JSON when strict content checking is disabled", () => {
    const editor = createEditor();
    const before = editor.getJSON();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      expect(editor.commands.insertContentAt(
        0,
        { type: "missing-node" },
        { errorOnInvalidContent: false }
      )).toBe(true);
      expect(editor.getJSON()).toEqual(before);
      expect(warning).toHaveBeenCalledOnce();
    } finally {
      warning.mockRestore();
    }
  });
});
