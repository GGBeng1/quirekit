import { EditorSelection, EditorState, StateEffect } from "@quirekit/cm-state";
import { describe, expect, it } from "vitest";
import { compositionEffect } from "../state/fields";
import { revealSelectionEffect, revealSelectionField, sourceRevealSelection } from "./gesture";

describe("source-reveal gesture state", () => {
  it("keeps native directed selections live while holding presentation, then reveals the final range", () => {
    const initial = EditorState.create({ doc: "before code after", extensions: revealSelectionField });
    const held = initial.update({ effects: revealSelectionEffect.of(initial.selection) }).state;
    const moved = held.update({ selection: EditorSelection.single(15, 4) }).state;
    expect(moved.selection.main.anchor).toBe(15);
    expect(moved.selection.main.head).toBe(4);
    expect(sourceRevealSelection(moved)).toBe(initial.selection);
    const released = moved.update({ effects: revealSelectionEffect.of(null) }).state;
    expect(sourceRevealSelection(released)).toBe(released.selection);
    expect(released.doc).toBe(initial.doc);
  });

  it("invalidates held coordinates on source, configuration or composition changes", () => {
    const initial = EditorState.create({ doc: "code", extensions: revealSelectionField });
    const held = initial.update({ effects: revealSelectionEffect.of(initial.selection) }).state;
    for (const change of [
      { changes: { from: 0, insert: "new " } },
      { effects: StateEffect.appendConfig.of(EditorState.readOnly.of(true)) },
      { effects: compositionEffect.of(true) },
      { effects: compositionEffect.of(false) },
    ]) {
      const state = held.update(change).state;
      expect(state.field(revealSelectionField)).toBeNull();
      expect(sourceRevealSelection(state)).toBe(state.selection);
    }
  });

  it("does not hold selection in an independent or unconfigured state", () => {
    const first = EditorState.create({ doc: "one", extensions: revealSelectionField });
    const held = first.update({ effects: revealSelectionEffect.of(first.selection) }).state;
    const second = EditorState.create({ doc: "two", selection: { anchor: 2 }, extensions: revealSelectionField });
    const plain = EditorState.create({ doc: "three", selection: { anchor: 3 } });
    expect(sourceRevealSelection(held)).toBe(first.selection);
    expect(sourceRevealSelection(second)).toBe(second.selection);
    expect(sourceRevealSelection(plain)).toBe(plain.selection);
  });
});
