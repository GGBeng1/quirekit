import { describe, expect, it } from "vitest";
import { EditorState, Transaction } from "@quirekit/cm-state";
import { history, undo } from "@quirekit/cm-commands";
import { InputRule, PasteRule } from "./definition";
import { sourceRules } from "./runtime";

describe("bounded source input rules", () => {
  it("transforms a typed suffix in its native transaction and undoes once", () => {
    let state = EditorState.create({ doc: "--", selection: { anchor: 2 }, extensions: [history(), sourceRules([
      new InputRule({ find: /-- /u, handler: () => "— " }),
    ], [])] });
    const transaction = state.update({ changes: { from: 2, insert: " " }, selection: { anchor: 3 }, annotations: Transaction.userEvent.of("input.type") });
    state = transaction.state;
    expect(state.doc.toString()).toBe("— ");
    expect(state.selection.main.head).toBe(2);
    expect(undo({ state, dispatch(value) { state = value.state; } })).toBe(true);
    expect(state.doc.toString()).toBe("--");
  });
  it("ignores composition, explicit commands and oversized paste; confines paste rules to inserted ranges", () => {
    const state = EditorState.create({ doc: "old :x:", extensions: sourceRules([
      new InputRule({ find: /:x:/u, handler: () => "X" }),
    ], [new PasteRule({ find: /:x:/gu, handler: () => "X" })]) });
    const edit = { changes: { from: state.doc.length, insert: " :x: :x:" } };
    expect(state.update(edit).newDoc.toString()).toBe("old :x: :x: :x:");
    expect(state.update({ ...edit, annotations: Transaction.userEvent.of("input.type.compose") }).newDoc.toString()).toBe("old :x: :x: :x:");
    expect(state.update({ ...edit, annotations: Transaction.userEvent.of("input.paste") }).newDoc.toString()).toBe("old :x: X X");
    const large = ":x:" + " ".repeat(65_536);
    expect(state.update({ changes: { from: 0, insert: large }, annotations: Transaction.userEvent.of("input.paste") }).newDoc.sliceString(0, 3)).toBe(":x:");
  });
});
