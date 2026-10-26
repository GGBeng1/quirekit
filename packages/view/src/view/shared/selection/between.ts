import type { ResolvedPos, Selection } from "@quirekit/pm";
import type { QuireMountedEditorView } from "../types";

/** PM createSelectionBetween handler shape accepted by mounted view bridges. */
type MountedCreateSelectionBetweenHandler = (
  view: QuireMountedEditorView,
  anchor: ResolvedPos,
  head: ResolvedPos
) => Selection | null;

/**
 * Resolves a custom PM-style selection between two document positions.
 *
 * @param view - Mounted view resolving plugin props.
 * @param anchor - Resolved anchor position.
 * @param head - Resolved head position.
 * @returns Custom selection returned by plugins, or null when none handles it.
 */
export function resolveMountedSelectionBetween(
  view: QuireMountedEditorView,
  anchor: ResolvedPos,
  head: ResolvedPos
): Selection | null {
  return (
    view.someProp("createSelectionBetween", (handler) =>
      typeof handler === "function"
        ? (handler as MountedCreateSelectionBetweenHandler)(view, anchor, head)
        : null
    ) ?? null
  );
}
