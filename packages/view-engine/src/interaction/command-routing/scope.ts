import { resolveQuireActiveSelectionContext } from "../selection";
import type {
  QuireCommandRoutingScope,
  QuireCommandRoutingScopeOptions
} from "./types";

/**
 * Resolves the command routing scope for the active editor selection.
 *
 * @param options - Current selection to classify.
 * @returns Command routing scope with an explicit selection domain and target kind.
 */
export function resolveQuireCommandRoutingScope(
  options: QuireCommandRoutingScopeOptions
): QuireCommandRoutingScope {
  const selectionContext =
    options.selectionContext ??
    resolveQuireActiveSelectionContext({
      selection: options.selection,
      interactionTarget: options.interactionTarget
    });

  return {
    selection: selectionContext.selection,
    selectionDomain: selectionContext.selectionDomain,
    targetKind: selectionContext.commandTarget,
    activeRoot: selectionContext.activeRoot,
    activeRegion: selectionContext.activeRegion,
    activeSource: selectionContext.activeSource,
    activeCapabilities: selectionContext.activeCapabilities,
    activeQueryOwner: selectionContext.activeQueryOwner,
    interactionTarget: selectionContext.interactionTarget
  };
}
