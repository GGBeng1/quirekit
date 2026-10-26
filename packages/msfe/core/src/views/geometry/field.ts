import { StateEffect, StateField, type EditorState, type Transaction } from "@quirekit/cm-state";
import { Decoration, EditorView } from "@quirekit/cm-view";
import { syntaxTree } from "@quirekit/cm-language";
import { modeFacet } from "../../state/fields";
import { sourceRevealSetting } from "../../presentation/visibility";
import { sourceRevealSelection } from "../../presentation/gesture";
import { isSourceRevealed, sourceRevealResolver } from "../../presentation/activation";
import { sourceFingerprint } from "../binding";
import { NodeHeightWidget } from "./widget";
import type { NodeGeometry, NodeGeometryUpdate, NodeHeight } from "./types";

/** Core-owned measured layout update; never a source edit. */
export const nodeGeometryEffect = StateEffect.define<NodeGeometryUpdate>();

/** @param entry - Previous measured source node. @param transaction - Canonical changes. @returns Mapped dimensions, or no dimensions when their source identity changed. */
function retain(entry: NodeHeight, transaction: Transaction): NodeHeight | undefined {
  let touched = false;
  transaction.changes.iterChangedRanges((from, to) => { if (from <= entry.to && to >= entry.from) touched = true; });
  if (touched) return undefined;
  const mapped = transaction.docChanged ? { ...entry, from: transaction.changes.mapPos(entry.from, 1), to: transaction.changes.mapPos(entry.to, -1) } : entry;
  let node = syntaxTree(transaction.state).resolveInner(mapped.from, 1);
  while (node.name !== mapped.name && node.parent) node = node.parent;
  return node.from === mapped.from && node.to === mapped.to && sourceFingerprint(mapped.spec, transaction.state, node) === mapped.source ? mapped : undefined;
}

/** @param state - Accepted source and presentation. @param entries - Previously measured nodes. @returns Direct geometry only where the source is not currently exposed. */
function decorations(state: EditorState, entries: readonly NodeHeight[]) {
  const mode = state.facet(modeFacet);
  if (mode === "source") return Decoration.none;
  return Decoration.set(entries.filter(entry => !(!entry.spec.showWhenActive && isSourceRevealed(state, entry)))
    .map(entry => Decoration.widget({ widget: new NodeHeightWidget(entry.height, entry.alignment), side: 1 }).range(entry.to)), true);
}

/** Pure per-document geometry; the only DOM reader is the mounted measurement plugin. */
export const nodeGeometryField = StateField.define<NodeGeometry>({
  create: () => ({ width: 0, entries: [], decorations: Decoration.none }),
  update(value, transaction) {
    let width = value.width, entries = value.entries;
    if (transaction.reconfigured) { width = 0; entries = []; }
    else if (transaction.docChanged || syntaxTree(transaction.startState) !== syntaxTree(transaction.state)) entries = entries.flatMap(entry => retain(entry, transaction) ?? []);
    for (const effect of transaction.effects) if (effect.is(nodeGeometryEffect)) {
      if (effect.value.width !== width) { width = effect.value.width; entries = []; }
      for (const entry of effect.value.entries) {
        entries = entries.filter(previous => previous.from !== entry.from || previous.name !== entry.name);
        if (entry.height > 0) entries = [...entries, entry];
      }
    }
    if (entries === value.entries && sourceRevealSelection(transaction.startState).eq(sourceRevealSelection(transaction.state))
      && transaction.startState.facet(modeFacet) === transaction.state.facet(modeFacet)
      && transaction.startState.facet(sourceRevealResolver) === transaction.state.facet(sourceRevealResolver)
      && sourceRevealSetting.read(transaction.startState) === sourceRevealSetting.read(transaction.state)) return value;
    return { width, entries, decorations: decorations(transaction.state, entries) };
  },
  provide: field => EditorView.decorations.from(field, value => value.decorations),
});
