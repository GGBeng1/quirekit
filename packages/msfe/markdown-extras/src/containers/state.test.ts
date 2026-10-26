import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { ensureSyntaxTree } from "@quirekit/cm-language";
import { collectContainers, getContainerIndexWork } from "./query";
import { containerSyntax } from "./syntax";
import { containerState, disclosureEffect } from "./state";

const source = "lead\n\n::: details 标题\nbody\n:::\n\ntail";
const from = source.indexOf("::: details");

/** @param doc - Canonical test text. @param initial - Host default. @returns Isolated backend state and its public slot. */
function fixture(doc = source, initial = false) {
  const slot = containerState(initial);
  const state = EditorState.create({ doc, extensions: [markdown({ extensions: containerSyntax(["details"]) }), slot.extension] });
  return { slot, state };
}

/** @param state - Cooperative native parse. @returns The state accepting all syntax before comparing projections. */
function parsed(state: EditorState): EditorState {
  expect(ensureSyntaxTree(state, state.doc.length, 5000)).not.toBeNull();
  return state.update({}).state;
}

describe("container disclosure state ownership", () => {
  it.each([100, 1000, 5000])("retains confirmed containers around a middle edit in %i paragraphs", count => {
    const doc = source + "\n\n" + Array.from({ length: count }, (_, index) => `paragraph ${index}\nsecond line\n\n`).join("") + source;
    const { slot, state } = fixture(doc);
    const before = parsed(state), index = slot.read(before).index, work = getContainerIndexWork(before);
    const position = doc.indexOf(`paragraph ${Math.floor(count / 2)}`) + 5;
    const after = parsed(before.update({ changes: { from: position, insert: "X" } }).state);
    const result = slot.read(after).index;
    expect(getContainerIndexWork(after).queries - work.queries).toBeGreaterThan(0);
    expect(getContainerIndexWork(after).visitedNodes - work.visitedNodes).toBeLessThan(20);
    expect(result.entries[0]).toBe(index.entries[0]);
    expect(result.entries[1]).toEqual({ ...index.entries[1], from: index.entries[1]!.from + 1,
      to: index.entries[1]!.to + 1, headerEnd: index.entries[1]!.headerEnd + 1 });
    expect(result.entries).toEqual(collectContainers(after).entries);
  });

  it("agrees with full collection through nested boundaries and separated edits", () => {
    const doc = "lead\n\n:::: details Outer\nfirst\n\n::: details Inner\nbody\n:::\n\nlast\n::::\n\ntail";
    const { state, slot } = fixture(doc);
    let current = parsed(state);
    const edits = [
      ["first", "first\n\nnew paragraph"], ["Inner", "Renamed"], ["body", "body\nmore"],
      ["\n:::\n", "\n::\n"], ["\n::\n", "\n:::\n"], ["::: details Renamed", "::: note Renamed"],
    ];
    for (const [needle, insert] of edits) {
      const at = current.doc.toString().indexOf(needle!);
      expect(at).toBeGreaterThanOrEqual(0);
      current = parsed(current.update({ changes: { from: at, to: at + needle!.length, insert: insert! } }).state);
      expect(slot.read(current).index.entries).toEqual(collectContainers(current).entries);
    }
    current = parsed(current.update({ changes: [{ from: 0, insert: "prefix\n\n" }, { from: current.doc.length, insert: "\n\n::: details New\nvalue\n:::" }] }).state);
    expect(slot.read(current).index.entries).toEqual(collectContainers(current).entries);
  });

  it("maps explicit choices and retires deleted owners without changing Markdown", () => {
    const { slot, state } = fixture();
    const opened = state.update({ effects: disclosureEffect.of({ from, expanded: true }) }).state;
    expect(opened.doc).toBe(state.doc); expect(slot.read(opened).expanded.get(from)).toBe(true);
    const shifted = opened.update({ changes: { from: 0, insert: "prefix\n" } }).state;
    expect(slot.read(shifted).expanded.get(from + 7)).toBe(true);
    const removed = opened.update({ changes: { from, to: source.lastIndexOf(":::") + 3 } }).state;
    expect(slot.read(removed).expanded.size).toBe(0);
    const restored = removed.update({ changes: { from, insert: source.slice(from, source.lastIndexOf(":::") + 3) } }).state;
    expect(slot.read(restored).expanded.size).toBe(0); expect(slot.read(restored).hidden.size).toBe(1);
  });
  it("retains the static index for unrelated selection transactions and resets across documents", () => {
    const { slot, state } = fixture();
    const next = state.update({ selection: { anchor: 2 } }).state;
    expect(slot.read(next)).toBe(slot.read(state));
    const opened = next.update({ effects: disclosureEffect.of({ from, expanded: true }) }).state;
    const fresh = fixture();
    expect(slot.read(opened).hidden.size).toBe(0); expect(fresh.slot.read(fresh.state).hidden.size).toBe(1);
  });
  it("supports an initially expanded host and explicit collapse without source history", () => {
    const { slot, state } = fixture(source, true);
    expect(slot.read(state).hidden.size).toBe(0);
    const closed = state.update({ effects: disclosureEffect.of({ from, expanded: false }) }).state;
    expect(slot.read(closed).hidden.size).toBe(1); expect(closed.doc.toString()).toBe(source);
  });
  it("exposes incomplete parses without dropping existing mapped choices", () => {
    const { slot, state } = fixture();
    const opened = state.update({ effects: disclosureEffect.of({ from, expanded: true }) }).state;
    const large = opened.update({ changes: { from: source.length, insert: "\n\ntext".repeat(50000) } }).state;
    expect(slot.read(large).index.ready).toBe(false);
    expect(slot.read(large).hidden.size).toBe(0);
    expect(slot.read(large).expanded.get(from)).toBe(true);
    const complete = parsed(large);
    expect(slot.read(complete).index.ready).toBe(true);
    expect(slot.read(complete).expanded.get(from)).toBe(true);
    expect(slot.read(complete).hidden.size).toBe(0);
    expect(slot.read(complete).index.entries).toEqual(collectContainers(complete).entries);
  });
});
