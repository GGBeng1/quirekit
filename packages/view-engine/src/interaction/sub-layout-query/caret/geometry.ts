import type { QuireSubLayoutQueryProducts } from "../../../layout";
import { readQuireSubLayoutCaretTextRectangle } from "../text-geometry";
import type { QuireLayoutNode } from "../../../layout";
import type {
  QuireCaretGeometry,
  QuireSelectionGeometryContext
} from "../../types";
import type { QuireSubLayoutCaretStop } from "../types";
import { iterateQuireSubLayoutQueryProductSets } from "../product-sets";
import { selectQuireSubLayoutCaretStop } from "./context";

/**
 * Builds collapsed caret geometry from retained sub-layout query products.
 *
 * @param nodes - Layout nodes to inspect.
 * @param position - Collapsed document position.
 * @param caretWidth - Width used for the returned caret rectangle.
 * @param side - Side preference used when wrapped fragments share one position.
 * @param selectionContext - Optional active selection context for repeated visual instances.
 * @returns Caret geometry, or null when no sub-layout product owns the position.
 */
export function buildQuireSubLayoutCaretGeometry(
  nodes: readonly QuireLayoutNode[],
  position: number,
  caretWidth: number,
  side = 1,
  selectionContext?: QuireSelectionGeometryContext | undefined
): QuireCaretGeometry | null {
  const stops: QuireSubLayoutCaretStop[] = [];
  const owners = new Map<QuireSubLayoutCaretStop, QuireSubLayoutQueryProducts>();
  for (const products of iterateQuireSubLayoutQueryProductSets(nodes)) {
    for (const candidate of products.caretStops) {
      if (candidate.position.pos !== position) continue;
      stops.push(candidate);
      owners.set(candidate, products);
    }
  }
  const stop = selectQuireSubLayoutCaretStop(stops, side, selectionContext);

  return stop
    ? {
        position: stop.position,
        rect: {
          ...clipCaretToAcceptedLine(owners.get(stop)!, stop),
          width: caretWidth
        },
        ...(stop.queryOwner === undefined
          ? {}
          : { queryOwner: stop.queryOwner })
      }
    : null;
}

/**
 * Clips a caret to its accepted line band while retaining every source endpoint.
 * @param products - Products owning this exact repeated visual occurrence.
 * @param stop - Full run-sized caret retained for logical mapping.
 * @returns Visible caret frame, including line leading when no ink is visible.
 */
function clipCaretToAcceptedLine(products: QuireSubLayoutQueryProducts, stop: QuireSubLayoutCaretStop): QuireSubLayoutCaretStop["rect"] {
  const line = readQuireSubLayoutCaretTextRectangle(products, stop)?.rect;
  if (line === undefined) return stop.rect;
  const top = Math.max(stop.rect.y, line.y);
  const bottom = Math.min(stop.rect.y + stop.rect.height, line.y + line.height);
  return {
    ...stop.rect,
    x: Math.max(line.x, Math.min(stop.rect.x, line.x + line.width)),
    y: bottom > top ? top : line.y,
    height: bottom > top ? bottom - top : line.height
  };
}
