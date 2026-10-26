import { describe, expect, it } from "vitest";
import { EditorState, Schema, Selection } from "@quirekit/pm";
import { BlockSelection } from "./selection";

const schema = new Schema({ nodes: { doc: { content: "block+" }, paragraph: { content: "text*", group: "block", attrs: { style: { default: null } } }, heading: { content: "text*", group: "block" }, text: { group: "inline" } } });
const doc = schema.node("doc", null, ["one", "two", "three"].map(text => schema.node("paragraph", null, schema.text(text))));

describe("complete block selection", () => {
  it("rejects partial text, different parents and invalid boundaries", () => {
    expect(BlockSelection.create(doc, 1, 4)).toBeNull();
    expect(BlockSelection.create(doc, 0, 6)).toBeNull();
    expect(BlockSelection.create(doc, NaN, 5)).toBeNull();
    const selection = BlockSelection.create(doc, 0, 10)!;
    expect(selection.content().openStart).toBe(0);
    expect(selection.content().content.childCount).toBe(2);
    expect(Selection.fromJSON(doc, selection.toJSON()).eq(selection)).toBe(true);
  });
  it("preserves insertions outside the range but drops the structural selection when an endpoint is deleted", () => {
    const selection = BlockSelection.create(doc, 5, 10)!;
    const state = EditorState.create({ schema, doc, selection });
    const insert = state.tr.insert(0, schema.node("paragraph", null, schema.text("new")));
    expect(selection.map(insert.doc, insert.mapping)).toMatchObject({ from: 10, to: 15 });
    const remove = state.tr.delete(5, 10);
    expect(selection.map(remove.doc, remove.mapping)).not.toBeInstanceOf(BlockSelection);
  });
  it("keeps complete block membership across attribute and node-type replacement", () => {
    const selection = BlockSelection.create(doc, 0, 10)!;
    const state = EditorState.create({ schema, doc, selection });
    const tr = state.tr.setNodeMarkup(0, schema.nodes.heading);
    expect(tr.selection).toBeInstanceOf(BlockSelection);
    expect(tr.selection).toMatchObject({ from: 0, to: 10 });
    const bookmark = selection.getBookmark().map(tr.mapping);
    const next = EditorState.create({ schema, doc: tr.doc, selection: tr.selection }).tr.setNodeMarkup(5, undefined, { style: "Heading2" });
    expect(bookmark.map(next.mapping).resolve(next.doc)).toBeInstanceOf(BlockSelection);
    expect(next.selection.content().content.childCount).toBe(2);
  });
  it("keeps empty paragraphs selected after formatting without absorbing boundary insertions", () => {
    const empty = schema.node("doc", null, [schema.node("paragraph"), schema.node("paragraph")]);
    const selection = BlockSelection.create(empty, 0, 2)!;
    const state = EditorState.create({ schema, doc: empty, selection });
    const changed = state.tr.setNodeMarkup(0, undefined, { style: "Heading1" });
    expect(changed.selection).toBeInstanceOf(BlockSelection);
    const insert = changed.insert(0, schema.node("paragraph"));
    expect(insert.selection).toMatchObject({ from: 2, to: 4 });
  });
  it("does not retain a shortened range when its first or last complete block is deleted", () => {
    const selection = BlockSelection.create(doc, 0, 10)!;
    const state = EditorState.create({ schema, doc, selection });
    for (const [from, to] of [[0, 5], [5, 10]] as const) {
      const tr = state.tr.delete(from, to);
      expect(tr.selection).not.toBeInstanceOf(BlockSelection);
    }
  });
});
