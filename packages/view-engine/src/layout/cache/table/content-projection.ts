import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireTableCellBlockFlowLayout } from "@quirekit/layout/table";
import { relocateQuireTextblockInput } from "../block/relocation/input";
import { readQuireInputRelocationSource } from "../block/relocation/provenance";
import type { QuireBlockLayoutInput } from "../../engine/block-types";

/**
 * Projects cached semantic-cell child inputs to a shifted source range.
 *
 * Ordinary leaf relocation owns complete source-field admission and projection.
 * Children bound to a collector service, nested products or capability products
 * cannot be remapped here; the current collector then supplies the shifted
 * children, and the retained height is reused only when each of them is a
 * relocation of the same collected input.
 *
 * @param layout - Retained cell content measured at the previous source range.
 * @param previousRange - Source content range represented by the retained layout.
 * @param currentRange - Current source content range for the same immutable cell node.
 * @param collectCurrent - Current collector of the cell's children.
 * @returns Range-shifted cell content, or undefined when safe projection is unavailable.
 */
export function projectQuireTableCellContentLayoutRange(
  layout: QuireTableCellBlockFlowLayout<QuireBlockLayoutInput>,
  previousRange: QuireDocumentRange,
  currentRange: QuireDocumentRange,
  collectCurrent?: () => readonly QuireBlockLayoutInput[]
): QuireTableCellBlockFlowLayout<QuireBlockLayoutInput> | undefined {
  if (rangeLength(previousRange) !== rangeLength(currentRange)) {
    return undefined;
  }
  const delta = currentRange.from - previousRange.from;
  if (delta === 0) {
    return layout;
  }

  // Share the ordinary input owner's complete PM-field projection. Services
  // that need a fresh collector cause the whole shifted cell to rebuild.
  const children: QuireBlockLayoutInput[] = [];
  for (const child of layout.children) {
    const projected = relocateQuireTextblockInput(child, delta);
    if (projected === undefined) {
      return reuseCollectedCellContent(layout, collectCurrent?.());
    }
    children.push(projected);
  }

  return { height: layout.height, children };
}

/**
 * Keeps a retained cell height for current children carrying the same content.
 *
 * @param layout - Retained cell content.
 * @param children - Children collected for the current snapshot.
 * @returns Retained height with the current children, or undefined when any child differs.
 */
function reuseCollectedCellContent(
  layout: QuireTableCellBlockFlowLayout<QuireBlockLayoutInput>,
  children: readonly QuireBlockLayoutInput[] | undefined
): QuireTableCellBlockFlowLayout<QuireBlockLayoutInput> | undefined {
  const origin = (input: QuireBlockLayoutInput) => readQuireInputRelocationSource(input) ?? input;
  return children !== undefined && children.length === layout.children.length
    && children.every((child, index) => origin(child) === origin(layout.children[index]!))
    ? { height: layout.height, children } : undefined;
}

/**
 * Reads the length of a document range.
 *
 * @param range - Range to measure.
 * @returns Non-negative range length.
 */
function rangeLength(range: QuireDocumentRange): number {
  return range.to - range.from;
}
