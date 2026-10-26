import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { history, undo } from "@quirekit/cm-commands";
import { createCommandRegistry } from "./registry";
import { buildCommandTransaction } from "./transaction";
import type { AuthorCommandFactories } from "./types";

describe("curried source commands", () => {
  it("composes nested commands against the current draft and publishes one undo event", () => {
    let state = EditorState.create({ doc: "", extensions: history() });
    let published = 0;
    const factories: AuthorCommandFactories = {
      insertText: (text: string) => ({ tr }) => tr.insertText(text),
      pair: () => ({ commands, state: before }) => commands.insertText("A") && commands.insertText(String(before.doc.length)),
      nested: () => ({ chain }) => chain().insertText("B").command(({ tr }) => tr.insertText("C")).run(),
      fail: () => ({ commands }) => { commands.insertText("discard"); return false; },
    };
    const registry = createCommandRegistry(factories, {
      run(commands) {
        const transaction = buildCommandTransaction(state, commands);
        if (!transaction) return { ok: false, reason: "not-applicable" };
        state = transaction.state; published++; return { ok: true };
      },
      can: command => buildCommandTransaction(state, [command]) !== null,
    }, () => ({} as never));
    const commands = registry.commands as unknown as { pair(): boolean; nested(): boolean; fail(): boolean };
    expect(commands.pair()).toBe(true);
    expect(state.doc.toString()).toBe("A0");
    expect(commands.nested()).toBe(true);
    expect(state.doc.toString()).toBe("A0BC");
    expect(published).toBe(2);
    expect(commands.fail()).toBe(false);
    expect(state.doc.toString()).toBe("A0BC");
    expect(published).toBe(2);
    expect(undo({ state, dispatch(transaction) { state = transaction.state; } })).toBe(true);
    expect(state.doc.toString()).toBe("A0");
  });

  it("runs queries on disposable drafts, retains failure diagnostics, and rolls back the whole chain", () => {
    let state = EditorState.create({ doc: "" });
    let publications = 0;
    const factories: AuthorCommandFactories = {
      insertText: (text: string) => ({ tr }) => tr.insertText(text),
      query: () => ({ can, state, commands }) => can().insertText("discard") && state.doc.length === 0 && commands.insertText("kept"),
      fail: () => () => false,
    };
    const registry = createCommandRegistry(factories, {
      run(commands) {
        const transaction = buildCommandTransaction(state, commands);
        if (!transaction) return { ok: false, reason: "not-applicable" };
        state = transaction.state; publications++; return { ok: true };
      }, can: command => buildCommandTransaction(state, [command]) !== null,
    }, () => ({} as never));
    expect(registry.can().insertText("query")).toBe(true);
    expect(state.doc.length).toBe(0);
    expect(publications).toBe(0);
    expect(registry.lastResult).toBeUndefined();
    expect(registry.chain().insertText("discard").command(() => false).run()).toBe(false);
    expect(state.doc.length).toBe(0);
    expect((registry.commands as unknown as { query(): boolean }).query()).toBe(true);
    expect(state.doc.toString()).toBe("kept");
    expect((registry.commands as unknown as { missing(): boolean }).missing()).toBe(false);
    expect(registry.lastResult).toEqual({ ok: false, reason: "not-installed" });
    registry.can().insertText("pure");
    expect(registry.lastResult).toEqual({ ok: false, reason: "not-installed" });
  });
});
