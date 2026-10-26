import {
  Selection,
  type Node as PMNode
} from "@quirekit/pm";

/**
 * Creates a nearby fallback selection for invalid mapped table selections.
 *
 * @param doc - Document to resolve against.
 * @param pos - Preferred fallback position.
 * @returns Nearby ProseMirror selection.
 */
export function createFallbackSelection(doc: PMNode, pos: number): Selection {
  return Selection.near(doc.resolve(clampPosition(pos, doc.content.size)));
}

/**
 * Clamps a document position to the valid top-level content range.
 *
 * @param pos - Position to clamp.
 * @param max - Largest valid document content position.
 * @returns Clamped position.
 */
function clampPosition(pos: number, max: number): number {
  return Math.max(0, Math.min(pos, max));
}
