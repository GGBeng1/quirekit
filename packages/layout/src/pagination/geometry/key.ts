import type { QuireRect } from "@quirekit/renderer";
import type { QuirePaginationGeometryKeyOptions } from "./types";

/**
 * Creates a stable cache key for page-drive prefix reuse.
 *
 * @param options - Page geometry, widow/orphan policy, and projection clips.
 * @returns Cache key covering pagination inputs that affect retained page records.
 */
export function createQuirePaginationGeometryKey(
  options: QuirePaginationGeometryKeyOptions
): string {
  const key = [
    serializeQuirePaginationRect(options.pageGeometry.pageRect),
    serializeQuirePaginationRect(options.pageGeometry.bodyRect),
    `body-variants:${serializeQuirePaginationBodyRectVariants(
      options.pageGeometry.bodyRectVariants
    )}`,
    `gap:${options.pageGeometry.pageGap}`,
    `columns:${serializeQuirePaginationColumns(options.pageGeometry.columns)}`,
    `first-top:${options.pageGeometry.firstPageBodyTop ?? ""}`,
    `first-bottom:${options.pageGeometry.firstPageBodyBottom ?? ""}`,
    `balance:${options.pageGeometry.balanceLastPageColumns === true ? 1 : 0}`,
    `widows:${options.widows ?? ""}`,
    `orphans:${options.orphans ?? ""}`,
    `clips:${serializeQuirePaginationClipRects(options.projectionClipRects)}`
  ].join("|");
  return options.collectSourceFragments === false
    ? `${key}|source-fragments:off`
    : key;
}

/**
 * Serializes page-position body rectangles for cache-key comparison.
 *
 * @param variants - Optional clone-safe page body variants.
 * @returns Stable variant signature.
 */
function serializeQuirePaginationBodyRectVariants(
  variants: QuirePaginationGeometryKeyOptions["pageGeometry"]["bodyRectVariants"]
): string {
  if (variants === undefined) {
    return "";
  }

  return [
    `first:${serializeOptionalQuirePaginationRect(variants.first)}`,
    `odd:${serializeOptionalQuirePaginationRect(variants.odd)}`,
    `even:${serializeOptionalQuirePaginationRect(variants.even)}`
  ].join(";");
}

/**
 * Serializes a column template for cache-key comparison.
 *
 * @param columns - Optional multi-column body layout.
 * @returns Stable column signature, empty for single-column pages.
 */
function serializeQuirePaginationColumns(
  columns: QuirePaginationGeometryKeyOptions["pageGeometry"]["columns"]
): string {
  if (columns === undefined) {
    return "";
  }

  return [
    columns.columns.map((column) => `${column.offset},${column.width}`).join(";"),
    `sep:${columns.separator ? 1 : 0}`,
    `measure:${columns.measureWidth}`
  ].join("/");
}

/**
 * Serializes an optional rectangle without inventing geometry.
 *
 * @param rect - Optional rectangle to serialize.
 * @returns Stable rectangle signature or an empty string.
 */
function serializeOptionalQuirePaginationRect(
  rect: QuireRect | undefined
): string {
  return rect === undefined ? "" : serializeQuirePaginationRect(rect);
}

/**
 * Serializes projection clip rectangles for cache-key comparison.
 *
 * @param clipRects - Normalized projection clips.
 * @returns Stable clip signature.
 */
function serializeQuirePaginationClipRects(
  clipRects: readonly QuireRect[] | undefined
): string {
  if (clipRects === undefined) {
    return "";
  }

  return clipRects.map(serializeQuirePaginationRect).join(";");
}

/**
 * Serializes one rectangle for pagination cache keys.
 *
 * @param rect - Rectangle to serialize.
 * @returns Stable rectangle signature.
 */
function serializeQuirePaginationRect(rect: QuireRect): string {
  return `${rect.x},${rect.y},${rect.width},${rect.height}`;
}
