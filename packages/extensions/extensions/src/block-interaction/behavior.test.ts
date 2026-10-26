import { createEditor, Extension, Node } from "@quirekit/core";
import { Plugin, Selection, undo, redo, undoDepth } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { UndoRedo } from "../undo-redo";
import { BlockInteraction } from "./extension";
import { readBlockCatalog } from "./identity";
import { BlockSelection } from "./selection";
import { TrailingNode } from "../trailing-node";

const Doc = Node.create({ name: "doc", topNode: true, content: "block+" });
const Paragraph = Node.create({ name: "paragraph", group: "block", content: "inline*" });
const Text = Node.create({ name: "text", group: "inline" });
/** @param editable - Editing permission. @param extra - Additional plugins. @returns Isolated editor. */
function setup(editable = true, extra: ReturnType<typeof Extension.create>[] = []) {
  let id = 0;
  return createEditor({ editable, extensions: [Doc, Paragraph, Text, UndoRedo, BlockInteraction.configure({ createId: () => `b${++id}` }), ...extra], content: { type: "doc", content: ["A", "B", "C", "D"].map(text => ({ type: "paragraph", content: [{ type: "text", text }] })) } });
}
/** @param editor - Test editor. @param from - Source order. @param to - End order. @param target - Target order. @param side - Target side. @returns Typed move request. */
function request(editor: ReturnType<typeof setup>, from = 0, to = 0, target = 3, side: "before" | "after" = "after") {
  const c = readBlockCatalog(editor)!;
  return { source: { anchor: c.blocks[from]!, focus: c.blocks[to]!, expectedDocumentRevision: c.revision }, destination: { target: c.blocks[target]!, side, expectedDocumentRevision: c.revision } };
}

describe("structural block behavior", () => {
  it("does not append content during identity initialization but retains trailing repair for editing", () => {
    const Atom = Node.create({ name: "atom", group: "block", atom: true });
    const e = createEditor({ extensions: [Doc, Paragraph, Text, Atom, TrailingNode.configure({ node: "paragraph" }), BlockInteraction.configure({ types: ["atom", "paragraph"] })], content: { type: "doc", content: [{ type: "atom" }] } });
    expect(e.state.doc.childCount).toBe(1);
    expect(typeof e.state.doc.firstChild!.attrs.blockId).toBe("string");
    const reopened = createEditor({ extensions: [Doc, Paragraph, Text, Atom, TrailingNode.configure({ node: "paragraph" }), BlockInteraction.configure({ types: ["atom", "paragraph"] })], content: e.getJSON() });
    expect(reopened.getJSON()).toEqual(e.getJSON());
    reopened.destroy();
    e.commands.insertContentAt(0, { type: "paragraph", content: [{ type: "text", text: "Before" }] });
    expect(e.state.doc.content.content.map(node => node.type.name)).toEqual(["paragraph", "atom", "paragraph"]);
    e.destroy();
  });
  it("moves complete ranges atomically with persistent identities and structural history", () => {
    const e = setup(), before = e.state.doc;
    expect(e.commands.moveBlockRange(request(e, 0, 1))).toBe(true);
    expect(e.state.doc.textContent).toBe("CDAB");
    expect(e.state.doc.child(2)).toEqual(before.child(0));
    expect(e.state.pm.selection).toBeInstanceOf(BlockSelection);
    expect(undoDepth(e.state.pm)).toBe(1);
    undo(e.state.pm, tr => e.view.dispatch(tr));
    expect(e.state.doc.eq(before)).toBe(true);
    redo(e.state.pm, tr => e.view.dispatch(tr));
    expect(e.state.doc.textContent).toBe("CDAB");
    e.destroy();
  });
  it("reserves an original identity when a raw copy is inserted before it", () => {
    const e = setup(), original = e.state.doc.firstChild!;
    e.view.dispatch(e.state.pm.tr.insert(0, original));
    expect(e.state.doc.child(1).attrs.blockId).toBe(original.attrs.blockId);
    expect(e.state.doc.child(0).attrs.blockId).not.toBe(original.attrs.blockId);
    undo(e.state.pm, tr => e.view.dispatch(tr));
    expect(e.state.doc.firstChild?.attrs.blockId).toBe(original.attrs.blockId);
    e.destroy();
  });
  it("keeps IDs unique after split and preserves the retained side", () => {
    const e = setup(), id = e.state.doc.firstChild!.attrs.blockId;
    e.view.dispatch(e.state.pm.tr.split(2));
    expect(e.state.doc.child(0).attrs.blockId).toBe(id);
    const ids = readBlockCatalog(e)!.blocks.map(b => b.blockId);
    expect(new Set(ids).size).toBe(ids.length);
    e.destroy();
  });
  it("does not allocate in read-only mode or on can/selection-only reads", () => {
    const readonly = setup(false);
    expect(readonly.state.doc.firstChild?.attrs.blockId).toBe(null);
    readonly.destroy();
    const e = setup(), c = readBlockCatalog(e)!;
    expect(e.can().moveBlockRange(request(e))).toBe(true);
    expect(readBlockCatalog(e)).toBe(c);
    e.commands.selectBlockRange(request(e).source);
    expect(readBlockCatalog(e)).toBe(c);
    expect(Selection.fromJSON(e.state.doc, e.state.pm.selection.toJSON())).toBeInstanceOf(BlockSelection);
    e.destroy();
  });
  it("rejects stale captures and adjacent no-ops without history", () => {
    const e = setup();
    expect(e.commands.moveBlockRange(request(e, 0, 0, 1, "before"))).toBe(false);
    expect(undoDepth(e.state.pm)).toBe(0);
    const stale = request(e);
    e.view.dispatch(e.state.pm.tr.insertText("x", 1));
    expect(e.commands.moveBlockRange(stale)).toBe(false);
    e.destroy();
  });
  it("collapses old ranges without changing the document or adding undo history", () => {
    const e = setup(), doc = e.state.doc;
    expect(e.commands.selectBlockRange(null)).toBe(false);
    e.commands.setTextSelection({ from: 1, to: 2 });
    expect(e.commands.selectBlockRange(null)).toBe(true);
    expect(e.state.pm.selection.empty).toBe(true);
    expect(e.commands.selectBlockRange(request(e, 1, 2).source)).toBe(true);
    e.setEditable(false);
    expect(e.can().selectBlockRange(null)).toBe(true);
    expect(e.state.pm.selection).toBeInstanceOf(BlockSelection);
    expect(e.commands.selectBlockRange(null)).toBe(true);
    expect(e.state.pm.selection.empty).toBe(true);
    expect(e.state.doc).toBe(doc);
    expect(undoDepth(e.state.pm)).toBe(0);
    expect(e.commands.selectBlockRange(request(e, 0, 2).source)).toBe(true);
    expect(e.state.pm.selection).toBeInstanceOf(BlockSelection);
    expect(e.state.doc).toBe(doc);
    e.destroy();
  });
  it("does not bypass transaction filters", () => {
    const reject = Extension.create({ name: "rejectMove", addProseMirrorPlugins: () => [new Plugin({ filterTransaction: tr => !tr.getMeta("quireBlockOperation") })] });
    const e = setup(true, [reject]), before = e.state.doc;
    e.commands.moveBlockRange(request(e));
    expect(e.state.doc).toBe(before);
    expect(undoDepth(e.state.pm)).toBe(0);
    e.destroy();
  });
  it("isolates typing before and after a move into separate history events", () => {
    const e = setup();
    e.view.dispatch(e.state.pm.tr.insertText("x", 1));
    e.commands.moveBlockRange(request(e));
    const landed = readBlockCatalog(e)!.blocks.at(-1)!;
    e.view.dispatch(e.state.pm.tr.insertText("y", landed.from + 1));
    expect(undoDepth(e.state.pm)).toBe(3);
    undo(e.state.pm, tr => e.view.dispatch(tr));
    expect(e.state.doc.textContent).toBe("BCDxA");
    undo(e.state.pm, tr => e.view.dispatch(tr));
    expect(e.state.doc.textContent).toBe("xABCD");
    undo(e.state.pm, tr => e.view.dispatch(tr));
    expect(e.state.doc.textContent).toBe("ABCD");
    e.destroy();
  });
  it("invalidates leases on document replacement and keeps instances independent", () => {
    const e = setup(), other = setup(), c = readBlockCatalog(e)!;
    const old = request(e);
    e.commands.replaceDocument(e.getJSON());
    expect(readBlockCatalog(e)!.rootId).not.toBe(c.rootId);
    expect(e.commands.moveBlockRange(old)).toBe(false);
    expect(readBlockCatalog(other)!.rootId).not.toBe(readBlockCatalog(e)!.rootId);
    e.destroy(); other.destroy();
  });
  it("inserts at the captured slot, selecting the new block for typing", () => {
    const e = setup();
    e.commands.insertBlockAt({ destination: request(e, 0, 0, 1, "before").destination });
    expect(e.state.doc.childCount).toBe(5);
    expect(e.state.doc.child(1).textContent).toBe("");
    expect(e.state.pm.selection.$from.parent.attrs.blockId).toBe(e.state.doc.child(1).attrs.blockId);
    expect(undoDepth(e.state.pm)).toBe(1);
    e.destroy();
  });
});
