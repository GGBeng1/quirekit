import { EditorState, Schema, TextSelection } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import { isAcceptedMainTextTarget, isMainTextTarget } from "./text-target";

const schema = new Schema({ nodes: {
  doc: { content: "block+" }, text: { group: "inline" },
  paragraph: { group: "block", content: "inline*" },
  group: { group: "block", content: "block+" },
  isolated: { group: "block", content: "block+", isolating: true },
  atom: { group: "block", content: "block+", atom: true }
} });

describe("mounted ordinary text target validation", () => {
  it("accepts canonical appendTransaction mapping only when text identity and local range survive", () => {
    const paragraph = schema.node("paragraph", null, schema.text("nested"));
    const doc = schema.node("doc", null, paragraph);
    const target = { doc, anchor: 6, head: 2 };
    const mapped = schema.node("doc", null, [schema.node("paragraph"), paragraph]);
    const state = EditorState.create({ doc: mapped, selection: TextSelection.create(mapped, 8, 4) });
    expect(isAcceptedMainTextTarget(target, state)).toBe(true);
    expect(isAcceptedMainTextTarget(target, state.apply(state.tr.setSelection(TextSelection.create(mapped, 8, 5))))).toBe(false);
    const replaced = schema.node("doc", null, schema.node("paragraph", null, schema.text("nested")));
    expect(isAcceptedMainTextTarget(target, EditorState.create({ doc: replaced, selection: TextSelection.create(replaced, 6, 2) }))).toBe(false);
  });
  it("admits nested text while preserving backward ranges and exact document identity", () => {
    const paragraph = schema.node("paragraph", null, schema.text("nested"));
    const doc = schema.node("doc", null, schema.node("group", null, paragraph));
    const target = { doc, anchor: 6, head: 2 };
    expect(isMainTextTarget(target, doc)).toBe(true);
    expect(isMainTextTarget(target, schema.node("doc", null, doc.content))).toBe(false);
    expect(isMainTextTarget({ ...target, head: -1 }, doc)).toBe(false);
    expect(isMainTextTarget({ ...target, head: 1.5 }, doc)).toBe(false);
  });
  it("refuses every atom or isolated ancestor and cross-textblock ranges", () => {
    const paragraph = schema.node("paragraph", null, schema.text("text"));
    for (const kind of ["isolated", "atom"]) {
      const doc = schema.node("doc", null, schema.node(kind, null, schema.node("group", null, paragraph)));
      expect(isMainTextTarget({ doc, anchor: 3, head: 4 }, doc)).toBe(false);
    }
    const doc = schema.node("doc", null, [paragraph, paragraph]);
    expect(isMainTextTarget({ doc, anchor: 1, head: 7 }, doc)).toBe(false);
  });
});
