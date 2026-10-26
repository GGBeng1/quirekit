import { EditorState, Schema, TextSelection } from "@quirekit/pm";
import { describe, expect, it } from "vitest";
import {
  QUIRE_TRANSACTION_RENDER_IMPACT_META_KEY,
  readQuireTransactionRenderImpact,
  setQuireTransactionRenderImpact
} from "./render-impact";

const schema = new Schema({ nodes: {
  doc: { content: "paragraph+" }, paragraph: { content: "text*" }, text: {}
} });

describe("transaction render impact declaration", () => {
  it("preserves the transaction, selection, steps and history policy", () => {
    const state = EditorState.create({ schema, doc: schema.node("doc", null, [
      schema.node("paragraph", null, schema.text("hello"))
    ]) });
    const tr = state.tr.setSelection(TextSelection.create(state.doc, 2))
      .setMeta("feature", { hovered: "first" }).setMeta("addToHistory", false);
    const selection = tr.selection;
    expect(setQuireTransactionRenderImpact(tr, { kind: "presentation-only" })).toBe(tr);
    expect(readQuireTransactionRenderImpact(tr)).toEqual({ kind: "presentation-only" });
    expect(tr.selection).toBe(selection);
    expect(tr.steps).toEqual([]);
    expect(tr.getMeta("feature")).toEqual({ hovered: "first" });
    expect(tr.getMeta("addToHistory")).toBe(false);
    expect(tr.docChanged).toBe(false);
    setQuireTransactionRenderImpact(tr, undefined);
    expect(readQuireTransactionRenderImpact(tr)).toBeUndefined();
  });

  it.each([undefined, null, false, "presentation-only", {}, { kind: "layout" }])(
    "rejects absent or unrecognized declaration %j", (value) => {
      const tr = EditorState.create({ schema }).tr
        .setMeta(QUIRE_TRANSACTION_RENDER_IMPACT_META_KEY, value);
      expect(readQuireTransactionRenderImpact(tr)).toBeUndefined();
    }
  );
});
