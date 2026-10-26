import { NodeSelection } from "@quirekit/pm";

/**
 * Reports whether a value is a ProseMirror node selection.
 *
 * @param value - Value to inspect.
 * @returns Whether the value is a node selection.
 */
export function isNodeSelection(value: unknown): value is NodeSelection {
  return value instanceof NodeSelection;
}
