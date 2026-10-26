const preferredStageGutterPixels = 48;
const minimumRailWidthPixels = 240;
const preferredRailWidthPixels = 340;

/**
 * Resolves the document-scrolled review rail width from the space the paper leaves.
 *
 * Below the minimum it keeps a readable width. The rail can extend beyond
 * the viewport without changing the paper's default reading center.
 *
 * @param paperWidth - Scaled paper width in CSS pixels.
 * @param workspaceWidth - Available workspace width in CSS pixels.
 * @returns Rail width in CSS pixels.
 */
export function calculateResponsiveRailWidth(
  paperWidth: number,
  workspaceWidth: number
): number {
  const available = Math.floor(Math.max(0, workspaceWidth) - Math.max(0, paperWidth));
  return Math.min(preferredRailWidthPixels, Math.max(minimumRailWidthPixels, available));
}

/**
 * Resolves the product stage width without changing the View-owned paper size.
 *
 * @param paperWidth - Measured paper width in CSS pixels.
 * @param workspaceWidth - Available workspace width in CSS pixels.
 * @returns Elastic stage width in CSS pixels.
 */
export function calculateResponsiveStageWidth(
  paperWidth: number,
  workspaceWidth: number
): number {
  const safePaperWidth = Math.max(0, paperWidth);
  const safeWorkspaceWidth = Math.max(0, workspaceWidth);
  const preferredWidth = safePaperWidth + preferredStageGutterPixels * 2;
  return Math.max(
    safePaperWidth,
    Math.min(preferredWidth, safeWorkspaceWidth)
  );
}

/**
 * Projects a horizontal reading position into the next overflow range.
 *
 * @param scrollLeft - Previous horizontal scroll offset in CSS pixels.
 * @param overflow - Previous maximum horizontal scroll offset in CSS pixels.
 * @param nextOverflow - Next maximum horizontal scroll offset in CSS pixels.
 * @param center - Previous scroll offset that centers the reading surface.
 * @param nextCenter - Next scroll offset that centers the reading surface.
 * @returns Next horizontal scroll offset in CSS pixels.
 */
export function projectResponsiveScrollLeft(
  scrollLeft: number,
  overflow: number,
  nextOverflow: number,
  center = overflow / 2,
  nextCenter = nextOverflow / 2
): number {
  if (nextOverflow <= 0) return 0;
  const origin = Math.min(overflow, Math.max(0, center));
  const target = Math.min(nextOverflow, Math.max(0, nextCenter));
  if (overflow <= 0) return target;
  const offset = Math.min(overflow, Math.max(0, scrollLeft)) - origin;
  // Native scroll positions may round to whole CSS pixels. Do not amplify
  // that rounding into a reading offset when the trailing rail grows.
  if (Math.abs(offset) <= 0.5) return target;
  // Each side keeps its own travel fraction; the review rail only enlarges
  // the right-hand range and cannot shift the default paper reading anchor.
  return offset < 0
    ? target + offset / origin * target
    : target + (overflow > origin ? offset / (overflow - origin) * (nextOverflow - target) : 0);
}
