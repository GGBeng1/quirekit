import type { EditorState } from "@quirekit/cm-state";
import { syntaxTree } from "@quirekit/cm-language";
import type { CompiledExtensions } from "../../extensions/types";
import { sourceDocument } from "../../source/authoring/adapter";
import { querySource } from "../../source/semantics/query";
import { modeFacet } from "../../state/fields";
import type { MsfeSourceRange } from "../../views/types";
import type { LayerCache, ProjectionLayer } from "./types";

/** @param layer - Declared presentation modes. @param state - Accepted or speculative state.
 * @returns Whether this layer can produce output in the current mode. */
export function layerEnabled(layer: ProjectionLayer, state: EditorState): boolean {
  return (layer.modes ?? ["live", "locked"]).includes(state.facet(modeFacet));
}

/** @param layer - Declared dependency policy. @param before - Previous state. @param after - Next state.
 * @returns Whether source descriptions must be rebuilt, independent of selection reveal filtering. */
export function layerChanged(layer: ProjectionLayer, before: EditorState, after: EditorState): boolean {
  const enabled = layerEnabled(layer, after);
  return enabled !== layerEnabled(layer, before) || enabled
    && (before.doc !== after.doc || syntaxTree(before) !== syntaxTree(after) || layerContextChanged(layer, before, after));
}

/** @param layer - Explicit dependency declaration. @param before - Prior accepted state. @param after - Next accepted state.
 * @returns Whether source-independent inputs require full rebuilding, including declared global state. */
export function layerContextChanged(layer: ProjectionLayer, before: EditorState, after: EditorState): boolean {
  return before.readOnly !== after.readOnly
    || before.facet(modeFacet) !== after.facet(modeFacet)
    || !!layer.selection && !before.selection.eq(after.selection)
    || !!layer.states?.some(slot => !Object.is(slot.read(before), slot.read(after)));
}

/** @param layer - Composable feature layer. @param state - Canonical state. @param range - Viewport or complete structural interval.
 * @param compiled - Semantic registry. @param previous - Prior cache. @param visit - Diagnostic visit counter.
 * @returns Pure immutable feature result, with work observations kept outside canonical state. */
export function buildLayer(layer: ProjectionLayer, state: EditorState, range: MsfeSourceRange, compiled: CompiledExtensions, previous?: LayerCache, visit?: () => void): LayerCache {
  const mode = state.facet(modeFacet);
  const enabled = layerEnabled(layer, state);
  const descriptions = enabled ? layer.build({ ...range,
    document: sourceDocument(state), mode, readOnly: state.readOnly,
    get selection() { if (!layer.selection) throw new Error(`undeclared-selection-dependency: ${layer.key}`); return state.selection; },
    query: name => querySource(state, compiled.sources.get(name), [range], visit),
    getState: slot => {
      if (!layer.states?.includes(slot)) throw new Error(`undeclared-state-dependency: ${layer.key}/${slot.key}`);
      return slot.read(state);
    },
  }) : [];
  // Validate authored identities before incremental mapping replaces positional keys.
  // The same source match may be returned twice, but one key cannot name two ranges.
  const keys = new Map<string, MsfeSourceRange>();
  for (const item of descriptions) {
    if (!("key" in item)) continue;
    const end = "to" in item ? item.to : item.from, before = keys.get(item.key);
    if (before && (before.from !== item.from || before.to !== end)) throw new Error(`duplicate-projection-widget: ${layer.key}/${item.key}`);
    keys.set(item.key, { from: item.from, to: end });
  }
  return { builds: (previous?.builds ?? 0) + Number(enabled), descriptions };
}
