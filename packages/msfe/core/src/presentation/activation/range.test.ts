import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@quirekit/cm-state";
import { modeFacet } from "../../state/fields";
import { sourceRevealSetting } from "../visibility";
import { revealSelectionEffect, revealSelectionField } from "../gesture";
import { isSourceRevealed, sourceRevealResolver } from "./range";

const fragment = { from: 3, to: 7 };

describe("source reveal ownership", () => {
  it("keeps node-local behavior by default and lets a host share one bounded owner", () => {
    const state = EditorState.create({ doc: "a **b** c\n\nremote", selection: { anchor: 1 }, extensions: [modeFacet.of("live")] });
    expect(isSourceRevealed(state, fragment)).toBe(false);
    const grouped = EditorState.create({ doc: state.doc, selection: state.selection, extensions: [modeFacet.of("live"),
      sourceRevealResolver.of(() => ({ from: 0, to: 9 }))] });
    expect(isSourceRevealed(grouped, fragment)).toBe(true);
    expect(grouped.selection.main.head).toBe(1);
    expect(isSourceRevealed(grouped.update({ selection: { anchor: 11 } }).state, fragment)).toBe(false);
  });

  it("uses the frozen pointer selection, and does not include a nonempty selection's end", () => {
    let state = EditorState.create({ doc: "abcdefghij", selection: { anchor: 4 }, extensions: [modeFacet.of("live"), revealSelectionField] });
    state = state.update({ effects: revealSelectionEffect.of(state.selection), selection: { anchor: 9 } }).state;
    expect(isSourceRevealed(state, fragment)).toBe(true);
    state = state.update({ effects: revealSelectionEffect.of(null) }).state;
    expect(isSourceRevealed(state, fragment)).toBe(false);
    expect(isSourceRevealed(state.update({ selection: EditorSelection.range(0, 3) }).state, fragment)).toBe(false);
  });

  it("honors hidden/locked/source presentation before calling the resolver", () => {
    for (const mode of ["source", "locked", "live"] as const) {
      const state = EditorState.create({ doc: "abcdefghij", selection: { anchor: 4 }, extensions: [modeFacet.of(mode),
        ...(mode === "live" ? [sourceRevealSetting.extension(() => "hidden")] : []),
        sourceRevealResolver.of(() => { throw new Error("must not resolve"); })] });
      expect(isSourceRevealed(state, fragment)).toBe(false);
    }
  });

  it("rejects an owner that loses its fragment or falls outside the document", () => {
    for (const owner of [{ from: 4, to: 8 }, { from: 0, to: 6 }, { from: -1, to: 8 }, { from: 0, to: 11 }]) {
      const state = EditorState.create({ doc: "abcdefghij", extensions: [modeFacet.of("live"), sourceRevealResolver.of(() => owner)] });
      expect(() => isSourceRevealed(state, fragment)).toThrow("invalid-source-reveal-owner");
    }
  });
});
