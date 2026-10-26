import { describe, expect, it } from "vitest";
import { Compartment, StateEffect, StateField, type EditorState } from "@quirekit/cm-state";
import { syntaxTree } from "@quirekit/cm-language";
import { createDocumentState } from "../../mount/state";
import { compositionEffect, modeFacet } from "../../state/fields";
import { sourceDocument, sourceNode } from "../../source/authoring/adapter";
import { readSourceDestination } from "../../source/destination";
import { nodeGeometryEffect, nodeGeometryField } from "./field";
import type { MsfeNodeViewSpec } from "../types";
import { sourceRevealSetting } from "../../presentation/visibility";
import { sourceRevealResolver } from "../../presentation/activation";

const spec: MsfeNodeViewSpec = { nodes: ["Image"], placement: "replace", read: () => ({}), patch: () => null,
  renderer: () => ({ update() {}, destroy() {} }),
  source: (state, node) => JSON.stringify([state.sliceDoc(node.from, node.to), readSourceDestination(sourceDocument(state), sourceNode(node))?.url]),
};

/** @param state - Canonical source. @returns Same state with one measured inline image height. */
function measured(state: EditorState): EditorState {
  let node = syntaxTree(state).resolveInner(state.doc.toString().indexOf("!["), 1);
  while (node.name !== "Image" && node.parent) node = node.parent;
  expect(node.name).toBe("Image");
  return state.update({ effects: nodeGeometryEffect.of({ width: 800, entries: [{ from: node.from, to: node.to, name: node.name,
    source: spec.source!(state, node), spec, height: 140, alignment: "middle" }] }) }).state;
}

describe("measured node geometry", () => {
  it("maps untouched nodes and discards dimensions after source edits", () => {
    const source = "lead\n\n![alt](/image)\n\ntail";
    let state = measured(createDocumentState(source, [nodeGeometryField, modeFacet.of("live")]));
    const initial = state.field(nodeGeometryField).entries[0]!;
    state = state.update({ changes: { from: 0, insert: "new " } }).state;
    expect(state.field(nodeGeometryField).entries[0]).toMatchObject({ from: initial.from + 4, to: initial.to + 4, height: 140 });
    state = state.update({ changes: { from: initial.from + 7, insert: "x" } }).state;
    expect(state.field(nodeGeometryField).entries).toEqual([]);
  });

  it("invalidates a reference image when its remote definition changes", () => {
    const source = "lead\n\n![alt][id]\n\n[id]: /first";
    let state = measured(createDocumentState(source, [nodeGeometryField, modeFacet.of("locked")]));
    state = state.update({ changes: { from: source.length - 5, to: source.length, insert: "second" } }).state;
    expect(state.field(nodeGeometryField).entries).toEqual([]);
  });

  it("retains unrelated measured geometry throughout composition and reveals only the active source", () => {
    const source = "lead\n\n![alt](/image)\n\ntail";
    let state = measured(createDocumentState(source, [nodeGeometryField, modeFacet.of("live")]));
    expect(state.field(nodeGeometryField).decorations.size).toBe(1);
    state = state.update({ selection: { anchor: 8 } }).state;
    expect(state.field(nodeGeometryField).decorations.size).toBe(0);
    expect(state.field(nodeGeometryField).entries).toHaveLength(1);
    state = state.update({ selection: { anchor: 0 }, effects: compositionEffect.of(true) }).state;
    expect(state.field(nodeGeometryField).decorations.size).toBe(1);
    state = state.update({ selection: { anchor: 8 } }).state;
    expect(state.field(nodeGeometryField).decorations.size).toBe(0);
    state = state.update({ selection: { anchor: 0 } }).state;
    state = state.update({ effects: compositionEffect.of(false) }).state;
    expect(state.field(nodeGeometryField).decorations.size).toBe(1);
    expect(state.doc.toString()).toBe(source);
  });

  it("keeps document-mode geometry consistent with its always-projected image", () => {
    const source = "lead\n\n![alt](/image)\n\ntail";
    let state = measured(createDocumentState(source, [nodeGeometryField, modeFacet.of("live"), sourceRevealSetting.extension(() => "hidden")]));
    state = state.update({ selection: { anchor: 8 }, effects: compositionEffect.of(true) }).state;
    expect(state.field(nodeGeometryField).decorations.size).toBe(1);
  });

  it("uses the same host reveal owner as the image component", () => {
    const source = "lead ![alt](/image)\n\ntail", end = source.indexOf("\n\n");
    let state = measured(createDocumentState(source, [nodeGeometryField, modeFacet.of("live"),
      sourceRevealResolver.of(() => ({ from: 0, to: end }))]));
    expect(state.field(nodeGeometryField).decorations.size).toBe(0);
    state = state.update({ selection: { anchor: source.length } }).state;
    expect(state.field(nodeGeometryField).decorations.size).toBe(1);
    expect(state.field(nodeGeometryField).entries).toHaveLength(1);
  });

  it("rematerializes retained geometry when a computed reveal owner changes", () => {
    const source = "lead ![alt](/image)\n\ntail", end = source.indexOf("\n\n");
    const toggle = StateEffect.define<boolean>();
    const enabled = StateField.define({ create: () => false,
      update: (value, transaction) => transaction.effects.find(effect => effect.is(toggle))?.value ?? value });
    let state = measured(createDocumentState(source, [nodeGeometryField, modeFacet.of("live"), enabled,
      sourceRevealResolver.compute([enabled], current => current.field(enabled)
        ? () => ({ from: 0, to: end }) : (_state, range) => range)]));
    const entries = state.field(nodeGeometryField).entries;
    expect(state.field(nodeGeometryField).decorations.size).toBe(1);
    state = state.update({ effects: toggle.of(true) }).state;
    expect(state.field(nodeGeometryField).entries).toBe(entries);
    expect(state.field(nodeGeometryField).decorations.size).toBe(0);
    state = state.update({ effects: toggle.of(false) }).state;
    expect(state.field(nodeGeometryField).decorations.size).toBe(1);
  });

  it("invalidates width generations, reconfiguration and replacement documents", () => {
    const source = "lead\n\n![alt](/image)";
    const mode = new Compartment();
    const original = measured(createDocumentState(source, [nodeGeometryField, mode.of(modeFacet.of("locked"))]));
    const resized = original.update({ effects: nodeGeometryEffect.of({ width: 300, entries: [] }) }).state;
    expect(resized.field(nodeGeometryField).entries).toEqual([]);
    expect(original.update({ effects: mode.reconfigure(modeFacet.of("source")) }).state.field(nodeGeometryField).entries).toEqual([]);
    expect(createDocumentState(source, [nodeGeometryField]).field(nodeGeometryField).entries).toEqual([]);
  });
});
