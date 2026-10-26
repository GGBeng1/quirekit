import type { QuireListMarker, QuireParagraphModelProfile } from "../../../../../document-profile/types";
import type { QuireListMarkerCollisionPolicy } from "../../../../types";

/**
 * Converts a marker's measured trailing edge into the effective suffix advance.
 *
 * @param marker - Resolved list-marker semantics.
 * @param markerX - Physical marker left edge in paragraph-local CSS pixels.
 * @param markerWidth - Measured marker width in CSS pixels.
 * @param paragraphWidth - Full paragraph coordinate space width.
 * @param rtl - Whether logical start is the physical right edge.
 * @param characterPitch - Effective paragraph character pitch in CSS pixels.
 * @param spaceWidth - Measured space advance in the marker font.
 * @param paragraphModel - Paragraph semantics resolving the marker tab stop.
 * @param collisionPolicy - View policy for a marker that exhausts the paragraph stops.
 * @returns Nonnegative advance between marker end and the first body glyph.
 */
export function resolveQuireNumberingSuffixAdvance(
  marker: QuireListMarker,
  markerX: number,
  markerWidth: number,
  paragraphWidth: number,
  rtl: boolean,
  characterPitch: number,
  spaceWidth: number,
  paragraphModel: QuireParagraphModelProfile,
  collisionPolicy: QuireListMarkerCollisionPolicy = "compact"
): number {
  if (marker.suffix === "nothing") return 0;
  if (marker.suffix === "space") return spaceWidth;
  const end = rtl ? paragraphWidth - markerX : markerX + markerWidth;
  const tab = paragraphModel.markerTab(marker, end, characterPitch);
  // Authored stops retain their exact geometry. Only automatic grid fallback
  // yields to compact clearance, before that advance reaches body shaping.
  if (tab.defaultGrid && collisionPolicy === "compact") return spaceWidth;
  return Math.max(0, tab.position - end);
}
