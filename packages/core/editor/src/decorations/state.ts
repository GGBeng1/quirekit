import { DecorationSet, type EditorState } from "@quirekit/pm";
import { mergeDecorationSets, mergeWidgetKeys } from "./sets";
import type { DecorationManagerState } from "./types";

/**
 * Constructs merged manager state from per-extension projections.
 *
 * @param state - Editor state the sets belong to.
 * @param sets - Decoration sets keyed by extension.
 * @param keys - Widget identities keyed by extension.
 * @returns Complete manager state.
 */
export function createDecorationManagerState(
  state: EditorState,
  sets: Record<string, DecorationSet>,
  keys: Record<string, Set<string>>
): DecorationManagerState {
  const names = Object.keys(sets);
  const onlyName = names[0];

  return {
    decorationSetsByExtension: sets,
    widgetKeysByExtension: keys,
    mergedDecorationSet: names.length === 1 && onlyName !== undefined
      ? sets[onlyName]!
      : mergeDecorationSets(state.doc, sets),
    widgetKeys: mergeWidgetKeys(keys)
  };
}
