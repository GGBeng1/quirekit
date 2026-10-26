import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { compositionEffect, compositionField, modeFacet } from "../../state/fields";
import { layerDecorations } from "./decorations";
import type { ProjectionLayer, ProjectionReplacement } from "./types";
import { sourceRevealSetting } from "../visibility";
import { sourceRevealResolver } from "../activation";

/** @param item - A replacement description. @param cursor - Canonical source position. @param placement - Structural or viewport ownership. @param hidden - Whether syntax stays projected while editing.
 * @returns Materialized decorations without a DOM or component host. */
function materialize(item: ProjectionReplacement, cursor: number, placement: ProjectionLayer["placement"] = "block", hidden = false) {
  const state = EditorState.create({ doc: "a `foo\nbar` z", selection: { anchor: cursor }, extensions: [modeFacet.of("live"),
    ...(hidden ? [sourceRevealSetting.extension(() => "hidden")] : [])] });
  return layerDecorations([{ layer: { key: "code", placement, build: () => [] }, cache: { builds: 1, descriptions: [item] } }], state,
    () => { throw new Error("Text fragments must not mount a component"); }, undefined);
}

const newline: ProjectionReplacement = { type: "replace", from: 6, to: 7, text: " ", block: false, key: "space", revealRange: { from: 2, to: 11 } };

describe("structural inline normalization", () => {
  it("suppresses only composition-intersecting output and honors an explicit opt-out", () => {
    const state = EditorState.create({ doc: "one\n\ntwo", selection: { anchor: 1 }, extensions: [modeFacet.of("live"), compositionField] })
      .update({ effects: compositionEffect.of(true) }).state;
    const descriptions: ProjectionReplacement[] = [
      { type: "replace", from: 0, to: 3, key: "active", text: "one", interaction: "atomic" },
      { type: "replace", from: 5, to: 8, key: "after", text: "two", interaction: "atomic" },
    ];
    const layer: ProjectionLayer = { key: "parts", placement: "block", build: () => descriptions };
    for (const suppress of [true, false]) {
      const output = layerDecorations([{ layer: { ...layer, suppressDuringComposition: suppress }, cache: { builds: 1, descriptions } }],
        state, () => { throw new Error("Text fragments do not mount"); }, undefined);
      expect(output.decorations.size).toBe(suppress ? 1 : 2);
    }
    const hidden = EditorState.create({ doc: state.doc, selection: state.selection,
      extensions: [modeFacet.of("live"), compositionField, sourceRevealSetting.extension(() => "hidden")] })
      .update({ effects: compositionEffect.of(true) }).state;
    expect(layerDecorations([{ layer, cache: { builds: 1, descriptions } }], hidden,
      () => { throw new Error("Text fragments do not mount"); }, undefined).decorations.size).toBe(2);
    expect(() => layerDecorations([{ layer, cache: { builds: 1, descriptions: [
      { ...descriptions[0]!, revealRange: { from: -1, to: 3 } },
    ] } }], state, () => { throw new Error("Text fragments do not mount"); }, undefined)).toThrow("invalid-projection-reveal-range");
  });

  it("keeps a multiline inline replacement in text flow", () => {
    const output = materialize(newline, 0);
    expect(output.decorations.size).toBe(1);
    output.decorations.between(0, 12, (from, to, value) => {
      expect([from, to, value.spec.block]).toEqual([6, 7, false]);
      expect(value.spec.widget).toBeDefined();
    });
    expect(output.atomic.size).toBe(0);
  });
  it("reveals all fragments when the selection touches their semantic owner", () => {
    expect(materialize(newline, 4).decorations.size).toBe(0);
    expect(materialize(newline, 11).decorations.size).toBe(0);
    expect(materialize(newline, 12).decorations.size).toBe(1);
  });
  it("keeps recognized fragments hidden and atomic in editable document presentation", () => {
    const output = materialize(newline, 4, "block", true);
    expect(output.decorations.size).toBe(1);
    expect(output.atomic.size).toBe(1);
  });
  it("resolves a normalization fragment's owner through the host without overriding atomic interactions", () => {
    const state = EditorState.create({ doc: "a `foo\nbar` z", selection: { anchor: 0 }, extensions: [modeFacet.of("live"),
      sourceRevealResolver.of(() => ({ from: 0, to: 13 }))] });
    for (const interaction of ["reveal", "atomic"] as const) {
      const output = layerDecorations([{ layer: { key: "code", placement: "block", build: () => [] },
        cache: { builds: 1, descriptions: [{ ...newline, interaction }] } }], state,
        () => { throw new Error("Text fragments do not mount components"); }, undefined);
      expect(output.decorations.size).toBe(interaction === "reveal" ? 0 : 1);
    }
  });
  it("rejects height-changing viewport replacements and invalid reveal ownership", () => {
    expect(() => materialize(newline, 0, "inline")).toThrow("block-projection-required");
    expect(() => materialize({ ...newline, revealRange: { from: 8, to: 10 } }, 0)).toThrow("invalid-projection-reveal-range");
  });
});
