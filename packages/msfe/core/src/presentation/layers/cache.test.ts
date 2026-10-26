import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { compileExtensions } from "../../extensions/compile";
import { compositionEffect, compositionField, modeFacet } from "../../state/fields";
import { buildLayer, layerChanged } from "./cache";
import { updateLayer } from "./incremental";
import type { ProjectionLayer } from "./types";

describe("projection author keys", () => {
  it("ignores all dependencies while a layer is disabled but rebuilds on activation", () => {
    const state = EditorState.create({ doc: "one\n\ntwo", extensions: [modeFacet.of("source")] });
    const layer: ProjectionLayer = { key: "preview", placement: "block", incremental: true,
      selection: true, build: () => [] };
    const changed = state.update({ changes: { from: 1, insert: "X" }, selection: { anchor: 4 } }).state;
    expect(layerChanged(layer, state, changed)).toBe(false);
    const active = EditorState.create({ doc: changed.doc, extensions: [modeFacet.of("live")] });
    expect(layerChanged(layer, changed, active)).toBe(true);
    expect(layerChanged(layer, active, changed)).toBe(true);
    expect(layerChanged({ ...layer, modes: ["source"] }, state, changed)).toBe(true);
  });

  it("retains source descriptions across composition instead of rebuilding or clearing every block", () => {
    const state = EditorState.create({ doc: "one\n\ntwo", extensions: [modeFacet.of("live"), compositionField] });
    const layer: ProjectionLayer = { key: "local", placement: "block", build: () => [
      { type: "replace", from: 5, to: 8, key: "after", text: "two" },
    ] };
    const composing = state.update({ effects: compositionEffect.of(true) }).state;
    expect(layerChanged(layer, state, composing)).toBe(false);
    expect(buildLayer(layer, composing, { from: 0, to: 8 }, compileExtensions([])).descriptions).toHaveLength(1);
    const ended = composing.update({ effects: compositionEffect.of(false) }).state;
    expect(layerChanged(layer, composing, ended)).toBe(false);
  });

  it("rejects duplicate author keys before assigning incremental component identities", () => {
    const state = EditorState.create({ doc: "one\n\ntwo", extensions: [modeFacet.of("live"), compositionField] });
    expect(() => buildLayer({ key: "preview", placement: "block", incremental: true, build: () => [
      { type: "replace", from: 0, to: 3, key: "same", text: "first" },
      { type: "replace", from: 5, to: 8, key: "same", text: "second" },
    ] }, state, { from: 0, to: 8 }, compileExtensions([]))).toThrow("duplicate-projection-widget: preview/same");
  });

  it("keeps undeclared global dependencies conservative on ordinary source edits", () => {
    const state = EditorState.create({ doc: "one\n\ntwo", extensions: [modeFacet.of("live"), compositionField] });
    const bounds: number[][] = [], compiled = compileExtensions([]);
    const layer: ProjectionLayer = { key: "global", placement: "block", build(input) {
      bounds.push([input.from, input.to]);
      return [{ type: "mark", from: 0, to: input.document.length, class: "whole-document" }];
    } };
    const before = buildLayer(layer, state, { from: 0, to: 8 }, compiled);
    const transaction = state.update({ changes: { from: 6, insert: "X" } });
    const next = updateLayer(layer, state, transaction.state, transaction.changes, { from: 0, to: 9 }, compiled, before, () => {}, () => {});
    expect(bounds).toEqual([[0, 8], [0, 9]]);
    expect(next.descriptions).toEqual([{ type: "mark", from: 0, to: 9, class: "whole-document" }]);
  });
});
