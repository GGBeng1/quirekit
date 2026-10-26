import type {
  QuireCaretCommand,
  QuireDisplayCommand,
  QuireFillRectCommand
} from "@quirekit/renderer";
import { resolveQuireViewLayerPaintSurface } from "../../view-graph";
import type { QuireCaretGeometry, QuireSelectionRangeGeometry } from "../../interaction";
import type { QuireDisplayListStyles } from "../types";

const selectionPaintSurface = resolveQuireViewLayerPaintSurface({
  layer: { plane: "selection" }
});

/**
 * Appends selection highlight fill commands to a display command list.
 *
 * @param commands - Mutable display command list being built.
 * @param ranges - Selection ranges that should be painted as fills.
 * @param styles - Resolved display-list styles.
 */
export function appendSelectionRangeCommands(
  commands: QuireDisplayCommand[],
  ranges: readonly QuireSelectionRangeGeometry[],
  styles: QuireDisplayListStyles
): void {
  let index = 0;

  for (const range of ranges) {
    commands.push({
      id: `selection-range-${index}`,
      kind: "fill-rect",
      layer: selectionPaintSurface,
      range: range.range,
      rect: range.rect,
      fillStyle: styles.selectionFillStyle
    } satisfies QuireFillRectCommand);
    index += 1;
  }
}

/**
 * Appends caret commands to a display command list.
 *
 * @param commands - Mutable display command list being built.
 * @param carets - Caret geometry that should be painted above text.
 * @param styles - Resolved display-list styles.
 */
export function appendCaretCommands(
  commands: QuireDisplayCommand[],
  carets: readonly QuireCaretGeometry[],
  styles: QuireDisplayListStyles
): void {
  let index = 0;

  for (const caret of carets) {
    commands.push({
      id: `caret-${index}`,
      kind: "caret",
      layer: selectionPaintSurface,
      range: { from: caret.position.pos, to: caret.position.pos },
      rect: caret.rect,
      fillStyle: styles.caretFillStyle
    } satisfies QuireCaretCommand);
    index += 1;
  }
}
