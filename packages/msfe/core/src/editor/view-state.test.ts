import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState, StateEffect, StateField, Transaction, type Extension } from "@quirekit/cm-state";
import type { EditorView } from "@quirekit/cm-view";
import { applyViewStateUpdate } from "./view-state";
import { compositionField, compositionEffect } from "../state/fields";

const choose = StateEffect.define<boolean>();
const field = StateField.define({ create: () => false, update: (value, transaction) => transaction.effects.find(effect => effect.is(choose))?.value ?? value });

/** @param extensions - Accepted native capabilities. @returns A transaction owner that records only accepted dispatches. */
function fixture(extensions: Extension = []) {
  let state = EditorState.create({ doc: "source", extensions: [field, compositionField, extensions] });
  const accepted: Transaction[] = [], scroll = StateEffect.define<null>();
  const view = { get state() { return state; }, scrollSnapshot: () => scroll.of(null),
    dispatch(transaction: Transaction) { accepted.push(transaction); state = transaction.state; },
  } as unknown as EditorView;
  return { view, accepted };
}

describe("canonical view-state authority", () => {
  it("accepts readonly disclosure and selection together without text or history changes", () => {
    const { view, accepted } = fixture(EditorState.readOnly.of(true));
    expect(applyViewStateUpdate(view, { effects: [choose.of(true)], selection: EditorSelection.single(2) })).toEqual({ ok: true });
    expect(view.state.field(field)).toBe(true); expect(view.state.selection.main.head).toBe(2);
    expect(view.state.doc.toString()).toBe("source"); expect(accepted).toHaveLength(1);
    expect(accepted[0]!.annotation(Transaction.addToHistory)).toBe(false);
  });
  it("rejects configuration effects and text changes introduced by transaction filters", () => {
    const plain = fixture();
    expect(applyViewStateUpdate(plain.view, { effects: [StateEffect.appendConfig.of(EditorState.readOnly.of(false))] })).toEqual({ ok: false, reason: "invalid-change" });
    expect(plain.accepted).toHaveLength(0);
    const filtered = fixture(EditorState.transactionFilter.of(transaction => transaction.effects.some(effect => effect.is(choose))
      ? [transaction, { changes: { from: 0, insert: "forbidden" } }] : transaction));
    expect(applyViewStateUpdate(filtered.view, { effects: [choose.of(true)] })).toEqual({ ok: false, reason: "invalid-change" });
    expect(filtered.accepted).toHaveLength(0); expect(filtered.view.state.doc.toString()).toBe("source");
  });
  it("lets passive state changes retain native scrolling without acquiring text or history authority", () => {
    const { view, accepted } = fixture(EditorState.readOnly.of(true));
    expect(applyViewStateUpdate(view, { effects: [choose.of(true)], preserveScroll: false })).toEqual({ ok: true });
    expect(accepted[0]!.effects).toHaveLength(1);
    expect(accepted[0]!.effects[0]!.is(choose)).toBe(true);
    expect(view.state.doc.toString()).toBe("source");
    expect(accepted[0]!.annotation(Transaction.addToHistory)).toBe(false);
    expect(applyViewStateUpdate(view, { effects: [choose.of(false)] })).toEqual({ ok: true });
    expect(accepted[1]!.effects).toHaveLength(2);
    expect(applyViewStateUpdate(view, { effects: [], preserveScroll: "false" as unknown as boolean })).toEqual({ ok: false, reason: "invalid-change" });
    expect(accepted).toHaveLength(2);
  });
  it("rejects composition and out-of-document selections without dispatch", () => {
    const { view, accepted } = fixture();
    expect(applyViewStateUpdate(view, { effects: [], selection: EditorSelection.single(99) })).toEqual({ ok: false, reason: "invalid-change" });
    expect(accepted).toHaveLength(0);
    view.dispatch(view.state.update({ effects: compositionEffect.of(true) }));
    expect(applyViewStateUpdate(view, { effects: [choose.of(true)] })).toEqual({ ok: false, reason: "composing" });
    expect(view.state.field(field)).toBe(false); expect(accepted).toHaveLength(1);
  });
});
