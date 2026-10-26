import { describe, expect, it, vi } from "vitest";
import { EditorSelection, EditorState, StateEffect } from "@quirekit/cm-state";
import { ensureSyntaxTree } from "@quirekit/cm-language";
import { markdown } from "@quirekit/cm-lang-markdown";
import { GFM } from "@quirekit/lezer-markdown";
import { Extension } from "../authoring/definition";
import { compileExtensions } from "../extensions/compile";
import { compositionEffect, compositionField, modeFacet } from "../state/fields";
import { planBlockInput } from "./routing";
import type { BlockInputContext, BlockInputRule } from "./types";

/** @param source - Source with one caret marker. @param rules - Declared block owners. @returns Parsed live input fixture. */
function fixture(source: string, rules: readonly BlockInputRule[]): EditorState {
  const compiled = compileExtensions([{ id: "input-test", blockInput: rules }]);
  const state = EditorState.create({ doc: source.replace("¦", ""), selection: { anchor: source.indexOf("¦") }, extensions: [
    markdown({ extensions: GFM }), compiled.extensions, modeFacet.of("live"), compositionField, EditorState.allowMultipleSelections.of(true),
  ] });
  expect(ensureSyntaxTree(state, state.doc.length, 5000)).not.toBeNull();
  return state.update({}).state;
}

/** @param context - Immutable whole-selection input. @returns One atomic insertion at all carets. */
function insert(context: BlockInputContext) {
  return context.state.changeByRange(range => ({ changes: { from: range.from, to: range.to, insert: "!" }, range: EditorSelection.cursor(range.from + 1) }));
}

describe("block input routing", () => {
  it("invokes only the nearest owner once, with inline syntax transparent", () => {
    const quote = vi.fn(insert), outer = vi.fn(insert), unrelated = vi.fn(insert);
    const state = fixture("> **text¦**", [
      { nodes: ["Paragraph"] }, { nodes: ["Blockquote"], enter: quote },
      { nodes: ["Document"], enter: outer }, { nodes: ["FencedCode"], enter: unrelated },
    ]);
    expect(state.update(planBlockInput(state, "enter")!).newDoc.toString()).toBe("> **text!**");
    expect(quote).toHaveBeenCalledTimes(1);
    expect(quote.mock.calls[0]![0].targets[0]!.node.name).toBe("Blockquote");
    expect(outer).not.toHaveBeenCalled();
    expect(unrelated).not.toHaveBeenCalled();
  });

  it("delegates one ancestor at a time from an explicitly declined nested owner", () => {
    const owners: number[] = [];
    const state = fixture("> > text¦", [{ nodes: ["Paragraph"] }, { nodes: ["Blockquote"], enter: context => {
      owners.push(context.targets[0]!.node.from);
      return context.targets[0]!.node.from > 0 ? "parent" : insert(context);
    } }]);
    expect(planBlockInput(state, "enter")).not.toBeNull();
    expect(owners).toEqual([2, 0]);
  });

  it.each(["native", undefined] as const)("keeps an explicit or unknown literal block as a native barrier: %s", behavior => {
    const outer = vi.fn(insert);
    const state = fixture("```\ntext¦\n```", [
      ...(behavior ? [{ nodes: ["FencedCode"], enter: behavior }] : []), { nodes: ["Document"], enter: outer },
    ]);
    expect(planBlockInput(state, "enter")).toBeNull();
    expect(outer).not.toHaveBeenCalled();
  });

  it("routes different intents independently, including explicit native decisions", () => {
    const state = fixture("text¦", [
      { nodes: ["Paragraph"], enter: "parent", lineBreak: "native", exit: () => "native" },
      { nodes: ["Document"], enter: insert, lineBreak: insert, exit: insert },
    ]);
    expect(planBlockInput(state, "enter")).not.toBeNull();
    expect(planBlockInput(state, "lineBreak")).toBeNull();
    expect(planBlockInput(state, "exit")).toBeNull();
  });

  it("resolves all carets before invoking a compatible handler once", () => {
    const handler = vi.fn(insert);
    const state = fixture("first¦\n\n## second", [{ nodes: ["Paragraph", "ATXHeading2"], enter: handler }])
      .update({ selection: EditorSelection.create([EditorSelection.cursor(5), EditorSelection.cursor(16)]) }).state;
    const next = state.update(planBlockInput(state, "enter")!);
    expect(next.newDoc.toString()).toBe("first!\n\n## second!");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0].targets.map(target => target.node.name)).toEqual(["Paragraph", "ATXHeading2"]);
  });

  it("does not invoke or partially apply incompatible owners for mixed carets", () => {
    const paragraph = vi.fn(insert), quote = vi.fn(insert);
    const state = fixture("text¦\n\n> quote", [
      { nodes: ["Paragraph"] }, { nodes: ["Document"], enter: paragraph }, { nodes: ["Blockquote"], enter: quote },
    ]).update({ selection: EditorSelection.create([EditorSelection.cursor(4), EditorSelection.cursor(13)]) }).state;
    expect(planBlockInput(state, "enter")).toBeNull();
    expect(paragraph).not.toHaveBeenCalled();
    expect(quote).not.toHaveBeenCalled();
  });

  it.each([false, true])("checks both ends of a nonempty selection, reversed: %s", reverse => {
    const handler = vi.fn(insert);
    const original = fixture("text¦\n\n```\ncode\n```", [{ nodes: ["Paragraph"], enter: handler }]);
    const state = original.update({ selection: { anchor: reverse ? 14 : 0, head: reverse ? 0 : 14 } }).state;
    expect(planBlockInput(state, "enter")).toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });

  it("replaces a backward selection atomically when both endpoints share an owner", () => {
    const handler = vi.fn(insert);
    const state = fixture("first¦\n\nsecond", [{ nodes: ["Paragraph"], enter: handler }])
      .update({ selection: { anchor: 13, head: 0 } }).state;
    expect(state.update(planBlockInput(state, "enter")!).newDoc.toString()).toBe("!");
    expect(handler.mock.calls[0]![0].targets).toHaveLength(2);
  });

  it("rejects readonly, composing and non-live states before consulting an owner", () => {
    const handler = vi.fn(insert);
    const state = fixture("text¦", [{ nodes: ["Paragraph"], enter: handler }]);
    for (const guarded of [
      state.update({ effects: StateEffect.appendConfig.of(EditorState.readOnly.of(true)) }).state,
      state.update({ effects: compositionEffect.of(true) }).state,
      ...(["source", "locked"] as const).map(mode => EditorState.create({ doc: "text", selection: { anchor: 4 },
        extensions: [markdown(), modeFacet.of(mode), compileExtensions([{ id: "input", blockInput: [{ nodes: ["Paragraph"], enter: handler }] }]).extensions] })),
    ]) expect(planBlockInput(guarded, "enter")).toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });

  it("keeps an unavailable syntax tree on the native path without forcing a parse", () => {
    const handler = vi.fn(insert);
    const state = EditorState.create({ doc: "text", extensions: [modeFacet.of("live"),
      compileExtensions([{ id: "input", blockInput: [{ nodes: ["Document"], enter: handler }] }]).extensions] });
    expect(planBlockInput(state, "enter")).toBeNull();
    expect(handler).not.toHaveBeenCalled();
  });

  it("rejects duplicate owners at extension compilation", () => {
    expect(() => compileExtensions([
      { id: "one", blockInput: [{ nodes: ["Paragraph"], enter: insert }] },
      { id: "two", blockInput: [{ nodes: ["Paragraph"], enter: "native" }] },
    ])).toThrow("duplicate-block-input-owner: Paragraph");
  });

  it("binds inherited author hooks with installation-local configured options", () => {
    const parent = Extension.create({ name: "owned-input", addOptions: () => ({ enabled: true }),
      addBlockInput() { return [{ nodes: ["Paragraph"], enter: this.options.enabled ? insert : "native" }] as const; },
    });
    const child = parent.extend({ addBlockInput() { return [...this.parent!(), { nodes: ["FencedCode"], enter: "native" }]; } });
    expect(compileExtensions([child]).ordered[0]!.blockInput).toHaveLength(2);
    expect(compileExtensions([child.configure({ enabled: false })]).ordered[0]!.blockInput![0]!.enter).toBe("native");
    expect(compileExtensions([child]).ordered[0]!.blockInput![0]!.enter).toBe(insert);
  });
});
