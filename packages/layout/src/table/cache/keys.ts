import type { QuireTableGridTrack } from "../types";
import type { QuireTableGridTrackCacheKey } from "./types";

/**
 * Creates a structural and geometry key for physical grid tracks.
 *
 * @param key - Normalized columns and exact table geometry.
 * @returns Stable key independent of source object identity.
 */
export function createQuireTableGridTrackVariantKey(
  key: QuireTableGridTrackCacheKey
): string {
  const columns = key.columns.map((column) => [
    column.id,
    column.columnIndex,
    column.width?.unit ?? "auto",
    column.width?.value ?? "auto"
  ].join(":"));

  return [
    key.layoutMode ?? "unspecified",
    key.x,
    key.availableWidth,
    key.cellSpacing,
    key.inlineMetricsSignature ?? "fixed-metrics",
    key.fitToWidth === true ? "fit" : "overflow",
    ...columns
  ].join("\u0001");
}

/**
 * Bounds geometry variants retained for one table identity.
 *
 * @param variants - Insertion-ordered grid variants.
 * @param maximumSize - Maximum variants to retain.
 */
export function trimOldestQuireTableGridVariant(
  variants: Map<string, readonly QuireTableGridTrack[]>,
  maximumSize: number
): void {
  while (variants.size > maximumSize) {
    const oldest = variants.keys().next().value;
    if (oldest === undefined) {
      return;
    }
    variants.delete(oldest);
  }
}
