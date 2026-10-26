import { EditorState, Schema } from "@quirekit/pm";
import { describe, expect, it, vi } from "vitest";
import { normalizeBlockIdentities } from "./normalize";
import type { BlockInteractionOptions } from "../types";

const schema = new Schema({ nodes: { doc: { content: "paragraph+" }, paragraph: { content: "text*", group: "block", attrs: { blockId: { default: null } } }, text: { group: "inline" } } });

describe("identity normalization work bounds", () => {
  it("does not enumerate the document again for proven inline edits after normalization", () => {
    let id = 0;
    const options: BlockInteractionOptions = { types: ["paragraph"], scopes: ["doc"], createId: () => `id-${++id}`, admit: () => null, requirePortableIdentity: false };
    const initial = EditorState.create({ schema, doc: schema.node("doc", null, Array.from({ length: 1000 }, () => schema.node("paragraph", null, schema.text("body")))) });
    const initialization = initial.tr;
    normalizeBlockIdentities(initialization, options);
    const before = initial.apply(initialization);
    const edit = before.tr.insertText("x", 2);
    const after = before.apply(edit);
    const scan = vi.spyOn(after.doc, "forEach");
    try {
      expect(normalizeBlockIdentities(after.tr, options, before.doc, [edit])).toBe(false);
      expect(scan).not.toHaveBeenCalled();
      expect(id).toBe(1000);
    } finally { scan.mockRestore(); }
  });
  it("still initializes an unnormalized read-only document when it first becomes editable", () => {
    let id = 0;
    const options: BlockInteractionOptions = { types: ["paragraph"], scopes: ["doc"], createId: () => `id-${++id}`, admit: () => null, requirePortableIdentity: false };
    const state = EditorState.create({ schema, doc: schema.node("doc", null, [schema.node("paragraph", null, schema.text("body"))]) });
    const edit = state.tr.insertText("x", 2);
    const tr = state.apply(edit).tr;
    expect(normalizeBlockIdentities(tr, options, state.doc, [edit])).toBe(true);
    expect(tr.doc.firstChild!.attrs.blockId).toBe("id-1");
  });
});
