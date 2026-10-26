import { TextSelection } from "@quirekit/pm";
import { resolveQuireVerticalCaretPosition } from "@quirekit/view-engine";
import type { QuireViewEndOfTextblockOptions } from "./types";

/**
 * Checks whether movement in a direction would leave the current textblock.
 *
 * @param options - Interaction geometry snapshot and movement direction.
 * @returns Whether the current selection is at that textblock boundary.
 */
export function resolveQuireViewEndOfTextblock(
  options: QuireViewEndOfTextblockOptions
): boolean {
  const selection = options.geometrySnapshot.state.pm.selection;

  if (!selection.empty || !(selection instanceof TextSelection)) {
    return false;
  }

  if (options.direction === "up" || options.direction === "down") {
    return (
      resolveQuireVerticalCaretPosition({
        snapshot: options.geometrySnapshot,
        position: { pos: selection.from, bias: 0 },
        direction: options.direction,
        ...(options.selectionContext === undefined
          ? {}
          : { selectionContext: options.selectionContext })
      }) === null
    );
  }

  const parentOffset = selection.$from.parentOffset;
  const parentSize = selection.$from.parent.content.size;

  return options.direction === "left" || options.direction === "backward"
    ? parentOffset === 0
    : parentOffset === parentSize;
}
