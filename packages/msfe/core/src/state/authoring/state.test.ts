import { describe, expect, it } from "vitest";
import { EditorState, Transaction } from "@quirekit/cm-state";
import { history, undo, redo } from "@quirekit/cm-commands";
import { defineEffect, defineMetadata, defineState } from "./definition";
import { commandDraft } from "../../commands/draft";
import { buildCommandTransaction } from "../../commands/transaction";
import { SourceRangeSet } from "../../ranges/set";
import { Extension } from "../../authoring/definition";
import { compileExtensions } from "../../extensions/compile";
import { StateSubscriptions } from "./subscriptions";

describe("transaction state authoring", () => {
  it("undoes a positional effect with text atomically and maps history through external insertions", () => {
    const replace = defineEffect<SourceRangeSet<string>>((value, changes) => value.map(changes));
    const slot = defineState({ key: "annotations", create: () => SourceRangeSet.from<string>(),
      update: (value, update) => update.effects(replace).at(-1) ?? value.map(update.changes),
      invert: (value, update) => update.effects(replace).length ? [replace.of(value)] : [],
    });
    let state = EditorState.create({ doc: "word", extensions: [history(), slot.extension] });
    const draft = commandDraft(state, {}, () => { throw new Error("unused"); }, false);
    draft.run(({ tr }) => tr.insertText("X") && tr.effect(replace, SourceRangeSet.from([{ id: "a", from: 1, to: 5, value: "note" }])));
    state = buildCommandTransaction(state, [() => draft.finish()])!.state;
    expect(slot.read(state).all()).toMatchObject([{ from: 1, to: 5 }]);
    // Remote/host changes stay outside local history but must map both undo and redo payloads.
    state = state.update({ changes: { from: 0, insert: "P" }, annotations: Transaction.addToHistory.of(false) }).state;
    expect(slot.read(state).all()).toMatchObject([{ from: 2, to: 6 }]);
    expect(undo({ state, dispatch: transaction => { state = transaction.state; } })).toBe(true);
    expect(state.doc.toString()).toBe("Pword"); expect(slot.read(state).all()).toEqual([]);
    state = state.update({ changes: { from: 0, insert: "Q" }, annotations: Transaction.addToHistory.of(false) }).state;
    expect(redo({ state, dispatch: transaction => { state = transaction.state; } })).toBe(true);
    expect(state.doc.toString()).toBe("QPXword"); expect(slot.read(state).all()).toMatchObject([{ from: 3, to: 7 }]);
  });
  it("keeps metadata through nested drafts and publishes selectors only after accepted value changes", () => {
    const set = defineEffect<number>(), meta = defineMetadata<string>();
    const slot = defineState({ key: "count", create: () => 0, update: (value, update) => update.effects(set).at(-1) ?? value });
    let state = EditorState.create({ extensions: slot.extension });
    const values: number[] = [], subscriptions = new StateSubscriptions(error => { throw error; });
    const dispose = subscriptions.add(state, { select: slot.read, change: value => { values.push(value); } });
    const draft = commandDraft(state, {}, () => { throw new Error("unused"); }, true);
    draft.run(({ tr }) => tr.effect(set, 3) && tr.setMeta(meta, "first") && tr.setMeta(meta, "second"));
    expect(values).toEqual([]); expect(slot.read(state)).toBe(0);
    const transaction = buildCommandTransaction(state, [() => draft.finish()])!;
    expect(meta.read(transaction)).toBe("first");
    state = transaction.state; subscriptions.publish(state); subscriptions.publish(state);
    expect(values).toEqual([3]); dispose();
    state = state.update({ effects: set.of(7) }).state; subscriptions.publish(state); expect(values).toEqual([3]);
  });
  it("rejects duplicate state owners and initializes each document independently", () => {
    const slot = defineState({ key: "local", create: () => ({ value: 0 }), update: value => value });
    const feature = Extension.create({ name: "owner", addState: () => [slot] });
    expect(() => compileExtensions([feature, feature.extend({ name: "collision" })])).toThrow("duplicate-state: local");
    const compiled = compileExtensions([feature]);
    expect(slot.read(EditorState.create({ extensions: compiled.extensions }))).not.toBe(slot.read(EditorState.create({ extensions: compiled.extensions })));
  });
});
