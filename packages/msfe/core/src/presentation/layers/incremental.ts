import { syntaxTree } from "@quirekit/cm-language";
import type { ChangeDesc, EditorState } from "@quirekit/cm-state";
import type { CompiledExtensions } from "../../extensions/types";
import type { MsfeSourceRange } from "../../views/types";
import { changedSyntaxRanges, touchesSourceRanges } from "../../source/parsing/changes";
import { buildLayer, layerContextChanged, layerEnabled } from "./cache";
import { mapLayerCache, retainLayerIdentities } from "./mapping";
import type { LayerCache, ProjectionLayer } from "./types";

/** @param state - Accepted source. @param ranges - Changed intervals in that source.
 * @returns Whether a reference definition participates in the changed syntax. */
function hasReferences(state: EditorState, ranges: readonly MsfeSourceRange[]): boolean {
  let found = false;
  for (const range of ranges) syntaxTree(state).iterate({ ...range, enter(node) {
    if (node.name === "LinkReference") found = true;
    return !found;
  } });
  return found;
}

/**
 * Incremental layers explicitly promise block-local reads and relocatable props.
 * Unknown contributions and non-source dependencies retain conservative full evaluation.
 * @param layer - Declared owner. @param before - Previous state. @param state - Accepted state.
 * @param changes - Exact source mapping. @param range - Complete document or visible interval.
 * @param compiled - Source registry. @param previous - Prior output.
 * @param visit - Actual parser traversal counter. @param build - Actual layer evaluation counter.
 * @param full - Explicit viewport or initial-mount rebuild.
 * @returns Updated descriptions with source-mapped component lifetimes.
 */
export function updateLayer(layer: ProjectionLayer, before: EditorState | undefined, state: EditorState, changes: ChangeDesc | undefined,
  range: MsfeSourceRange, compiled: CompiledExtensions, previous: LayerCache | undefined, visit: () => void, build: () => void, full = false): LayerCache {
  // Disabled output has no source dependency. Reactivation takes the full-build
  // path below because mode is part of the shared layer context contract.
  if (!layerEnabled(layer, state)) return { descriptions: [], builds: previous?.builds ?? 0 };
  const mapped = previous && changes ? mapLayerCache(previous, changes) : previous;
  let dirty: readonly MsfeSourceRange[] = [range];
  if (layer.incremental && before && changes && previous && !full && !layerContextChanged(layer, before, state)) {
    dirty = changedSyntaxRanges(before, state, changes);
    const inverse = changes.invertedDesc;
    const references = layer.references && (hasReferences(state, dirty)
      || hasReferences(before, dirty.map(item => ({ from: inverse.mapPos(item.from, -1), to: inverse.mapPos(item.to, 1) }))));
    dirty = references ? [range] : dirty.filter(item => item.to >= range.from && item.from <= range.to)
      .map(item => ({ from: Math.max(range.from, item.from), to: Math.min(range.to, item.to) }));
  }
  const rebuilt = dirty.flatMap(interval => { build(); return buildLayer(layer, state, interval, compiled, undefined, visit).descriptions; });
  const retained = mapped?.descriptions.filter(item => !touchesSourceRanges(item.type === "replace" && item.revealRange ? item.revealRange
    : { from: item.from, to: "to" in item ? item.to : item.from }, dirty)) ?? [];
  const descriptions = [...retained, ...rebuilt], builds = (previous?.builds ?? 0) + dirty.length;
  return layer.incremental ? retainLayerIdentities(descriptions, mapped, builds) : { descriptions, builds };
}
