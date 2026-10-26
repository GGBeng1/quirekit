import type { QuireRect } from "@quirekit/renderer";
import type {
  QuireTableFloatingHorizontalAlignment,
  QuireTableFloatingReference,
  QuireTableFloatingVerticalAlignment
} from "../types";
import type {
  QuireTableFloatingPosition,
  QuireTableFloatingPositionInput
} from "./types";

/**
 * Resolves one floating table against page-projected reference rectangles.
 *
 * @param input - Placement source, page references, table geometry, and page parity.
 * @returns Resolved document-space table origin.
 */
export function resolveQuireTableFloatingPosition(
  input: QuireTableFloatingPositionInput
): QuireTableFloatingPosition {
  const horizontalReference = resolveReferenceRect(
    input.placement.horizontal.reference,
    input
  );
  const verticalReference = resolveReferenceRect(
    input.placement.vertical.reference,
    input
  );

  // The source supplies geometric reference adjustments; every projected table
  // product shares this origin rather than compensating only at paint time.
  const expansion = input.placement.horizontal.referenceExpansion;
  const horizontalOrigin = expansion === undefined ? horizontalReference : {
    ...horizontalReference,
    x: horizontalReference.x - expansion.start,
    width: horizontalReference.width + expansion.start + expansion.end
  };

  return {
    x: resolveHorizontalPosition(
      horizontalOrigin,
      input.tableRect.width,
      input.placement.horizontal.offset,
      input.placement.horizontal.alignment,
      input.pageIndex
    ) + input.indent,
    y: resolveVerticalPosition(
      verticalReference,
      input.tableRect.height,
      input.placement.vertical.offset,
      input.placement.vertical.alignment,
      input.pageIndex
    )
  };
}

/**
 * Selects the rectangle that owns one floating placement axis.
 *
 * @param reference - Canonical page, margin, or text reference.
 * @param input - Available page-projected reference rectangles.
 * @returns Reference rectangle used by the axis resolver.
 */
function resolveReferenceRect(
  reference: QuireTableFloatingReference,
  input: QuireTableFloatingPositionInput
): QuireRect {
  if (reference === "page") {
    return input.pageRect;
  }

  return reference === "margin" ? input.marginRect : input.textRect;
}

/**
 * Resolves a floating table's horizontal coordinate.
 *
 * @param reference - Selected horizontal reference rectangle.
 * @param extent - Measured table width.
 * @param offset - Absolute offset from the reference start.
 * @param alignment - Relative alignment, when declared.
 * @param pageIndex - Zero-based physical page index.
 * @returns Resolved horizontal coordinate before table indentation.
 */
function resolveHorizontalPosition(
  reference: QuireRect,
  extent: number,
  offset: number | null,
  alignment: QuireTableFloatingHorizontalAlignment | null,
  pageIndex: number
): number {
  if (alignment === null) {
    return reference.x + (offset ?? 0);
  }

  return resolveAlignedAxisPosition(
    reference.x,
    reference.width,
    extent,
    alignment,
    pageIndex
  );
}

/**
 * Resolves a floating table's vertical coordinate.
 *
 * @param reference - Selected vertical reference rectangle.
 * @param extent - Measured table height.
 * @param offset - Absolute offset from the reference start.
 * @param alignment - Relative alignment, when declared.
 * @param pageIndex - Zero-based physical page index.
 * @returns Resolved vertical coordinate.
 */
function resolveVerticalPosition(
  reference: QuireRect,
  extent: number,
  offset: number | null,
  alignment: QuireTableFloatingVerticalAlignment | null,
  pageIndex: number
): number {
  if (alignment === null) {
    return reference.y + (offset ?? 0);
  }

  return resolveAlignedAxisPosition(
    reference.y,
    reference.height,
    extent,
    alignment,
    pageIndex
  );
}

/**
 * Resolves start, center, end, inside, or outside alignment on one axis.
 *
 * The first physical page is odd. Inside therefore maps to the start edge on
 * odd pages and the end edge on even pages; outside uses the inverse.
 *
 * @param origin - Reference-axis origin.
 * @param referenceExtent - Reference-axis extent.
 * @param objectExtent - Floating object extent on the same axis.
 * @param alignment - Canonical relative alignment.
 * @param pageIndex - Zero-based physical page index.
 * @returns Resolved coordinate on the selected axis.
 */
function resolveAlignedAxisPosition(
  origin: number,
  referenceExtent: number,
  objectExtent: number,
  alignment: QuireTableFloatingHorizontalAlignment
    | QuireTableFloatingVerticalAlignment,
  pageIndex: number
): number {
  const isOddPhysicalPage = pageIndex % 2 === 0;
  const resolvedAlignment = alignment === "inside"
    ? (isOddPhysicalPage ? "start" : "end")
    : alignment === "outside"
      ? (isOddPhysicalPage ? "end" : "start")
      : alignment;

  if (resolvedAlignment === "center") {
    return origin + ((referenceExtent - objectExtent) / 2);
  }
  if (resolvedAlignment === "end") {
    return origin + referenceExtent - objectExtent;
  }

  return origin;
}
