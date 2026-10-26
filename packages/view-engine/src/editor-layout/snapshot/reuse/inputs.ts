import { baselineQuireLineBreakerPolicy } from "@quirekit/layout/inline";
import { normalizeQuirePositiveAreaRects, type QuireRect } from "@quirekit/renderer";
import type { QuireLayoutSnapshotOptions } from "../../types";
import { defaultLayoutTextMeasurer } from "../constants";

/**
 * Captures bounded layout values without retaining mutable comparison objects.
 *
 * @param options - Current layout configuration.
 * @returns Canonical value signature independent of caller object allocation.
 */
export function captureQuireLayoutInputSignature(options: QuireLayoutSnapshotOptions): string {
  const geometry = options.pageGeometry;
  return JSON.stringify([
    rectValues(options.viewportRect),
    geometry === undefined ? null : [
      rectValues(geometry.pageRect), rectValues(geometry.bodyRect), geometry.pageGap,
      rectValues(geometry.bodyRectVariants?.first),
      rectValues(geometry.bodyRectVariants?.odd),
      rectValues(geometry.bodyRectVariants?.even)
    ],
    options.widows, options.orphans, options.font, options.textBaselineOffset,
    options.lineBreakMode, options.hiddenTextViewMode, options.listMarkerCollision,
    options.maxBlocks, options.maxShapedBlockExtent
  ]);
}

/**
 * Captures the projection window separately from canonical layout dependencies.
 *
 * @param options - Current snapshot clipping configuration.
 * @returns Owned signature using the same normalization as page projection.
 */
export function captureQuireLayoutProjectionSignature(options: QuireLayoutSnapshotOptions): string {
  return JSON.stringify(normalizeQuirePositiveAreaRects(options.snapshotClipRects)?.map(rectValues) ?? null);
}

/**
 * Captures metric identities separately from bounded geometry values.
 *
 * @param options - Current layout configuration.
 * @returns Identity and resource-version tokens copied for this attempt.
 */
export function captureQuireLayoutInputIdentities(options: QuireLayoutSnapshotOptions): readonly unknown[] {
  const measurer = options.textMeasurer ?? defaultLayoutTextMeasurer;
  return [options.state.schema, measurer, measurer.version, options.lineBreaker];
}

/**
 * Rejects callbacks without a resource-version contract admitted by this slice.
 *
 * @param options - Current layout configuration.
 * @returns Whether measurement and line-breaking inputs can prove stability.
 */
export function hasQuireStableLayoutServices(options: QuireLayoutSnapshotOptions): boolean {
  return (options.textMeasurer === undefined
      || options.textMeasurer === defaultLayoutTextMeasurer
      || options.textMeasurer.version !== undefined)
    && (options.lineBreaker === undefined || options.lineBreaker === baselineQuireLineBreakerPolicy);
}

/**
 * Copies exactly the rectangle fields consumed by layout and projection.
 *
 * @param rect - Optional caller-owned rectangle.
 * @returns Primitive rectangle values, or null for an absent variant.
 */
function rectValues(rect: QuireRect | undefined): readonly number[] | null {
  return rect === undefined ? null : [rect.x, rect.y, rect.width, rect.height];
}
