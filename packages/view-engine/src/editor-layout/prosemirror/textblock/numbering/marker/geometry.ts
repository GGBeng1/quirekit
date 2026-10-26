import type { QuireListMarker } from "../../../../../document-profile/types";
import type { QuireTextblockIndentationGeometry } from "../../indentation";
import type { QuireListMarkerCollisionPolicy } from "../../../../types";
import type { QuireTextFragment } from "@quirekit/layout/text";

const minimumTextWidth = 1;

/**
 * Aligns one generated marker to the first canonical body line box.
 * @param marker - Marker fragment created before body shaping.
 * @param body - Fresh editable body fragments in visual order.
 * @returns Marker sharing the body's baseline and, for exact spacing, clip band.
 */
export function alignWordNumberingMarkerToFirstLine(
  marker: QuireTextFragment,
  body: readonly QuireTextFragment[],
  baselineShift = 0
): QuireTextFragment {
  const firstLine = body[0];
  if (firstLine === undefined) return marker;
  const markerAscent = marker.baseline - marker.rect.y;
  // Ordinary lines preserve marker hit geometry; exact lines share the body's
  // vertical clip band even when a larger marker has a different natural strut.
  return {
    ...marker,
    ...(firstLine.clipToLine !== true ? {} : { clipToLine: true, lineHeight: firstLine.lineHeight }),
    rect: {
      ...marker.rect,
      y: firstLine.clipToLine === true ? firstLine.rect.y : firstLine.baseline - baselineShift - markerAscent,
      ...(firstLine.clipToLine !== true ? {} : { height: firstLine.rect.height })
    },
    baseline: firstLine.baseline - baselineShift
  };
}

/** Inputs used to position a generated marker inside the hanging interval. */
export interface ResolveQuireTextblockMarkerXOptions {
  /** Resolved list-body geometry. */
  readonly geometry: QuireTextblockIndentationGeometry;
  /** Resolved first-line indentation in CSS pixels; negative values hang. */
  readonly firstLine: number;
  /** Resolved paragraph base direction. */
  readonly baseDirection: "ltr" | "rtl" | "auto";
  /** Measured marker glyph width. */
  readonly markerWidth: number;
  /** Visual gap retained between an end-aligned marker and body text. */
  readonly gap: number;
  /** Logical marker justification from the numbering level. */
  readonly justification: QuireListMarker["justification"];
}

/** Inputs used to reserve first-line body space after marker measurement. */
export interface ResolveQuireTextblockMarkerBodyGeometryOptions {
  /** Following-line paragraph geometry before marker collision handling. */
  readonly geometry: QuireTextblockIndentationGeometry;
  /** Physical marker x in textblock-local CSS pixels. */
  readonly markerX: number;
  /** Measured physical marker width. */
  readonly markerWidth: number;
  /** Visual advance required by the numbering suffix. */
  readonly suffixAdvance: number;
  /** Physical numbering-level body boundary used by Word-compatible rebound. */
  readonly levelBodyStartX?: number | undefined;
  /** Collision behavior selected by the mounted View. */
  readonly collisionPolicy?: QuireListMarkerCollisionPolicy | undefined;
  /** Resolved paragraph base direction. */
  readonly baseDirection: "ltr" | "rtl" | "auto";
}

/**
 * Positions a generated marker without moving editable paragraph text.
 *
 * Negative first-line indentation defines the hanging interval. Ordered
 * markers normally align toward the body, while bullets align toward the
 * interval's outer edge. The same logical rules mirror under RTL.
 *
 * @param options - Body geometry, indentation, marker metrics, and alignment.
 * @returns Physical marker x in textblock-local CSS pixels.
 */
export function resolveQuireTextblockMarkerX(
  options: ResolveQuireTextblockMarkerXOptions
): number {
  const firstLine = options.firstLine;
  const rtl = options.baseDirection === "rtl";
  const bodyEdge = rtl ? options.geometry.x + options.geometry.width : options.geometry.x;
  if (firstLine >= 0) {
    return rtl ? bodyEdge - firstLine - options.markerWidth : bodyEdge + firstLine;
  }
  const hangingWidth = -firstLine;
  const room = hangingWidth - options.markerWidth;
  const offset = room < options.gap ? 0
    : options.justification === "center" ? room / 2
      : options.justification === "end" ? room - options.gap : 0;
  return rtl ? bodyEdge + hangingWidth - options.markerWidth - offset
    : bodyEdge - hangingWidth + offset;
}

/**
 * Keeps the first editable glyph clear of the generated marker and suffix.
 *
 * Following lines retain the paragraph body interval. Only the first line is
 * narrowed when a reduced hanging indent no longer contains marker + suffix.
 * Compact mode clears the measured prefix exactly; Word-compatible mode
 * rebounds a collision to the numbering level's ordinary body boundary.
 *
 * @param options - Base geometry, measured marker box, suffix, and direction.
 * @returns Collision-adjusted first-line geometry with a stable signature.
 */
export function resolveQuireTextblockMarkerBodyGeometry(
  options: ResolveQuireTextblockMarkerBodyGeometryOptions
): QuireTextblockIndentationGeometry {
  const { geometry } = options;
  const rtl = options.baseDirection === "rtl";
  // Project both directions onto an increasing logical axis before collision
  // handling; following-line geometry remains owned by paragraph indentation.
  const end = rtl ? -geometry.x : geometry.x + geometry.width;
  const requested = rtl ? -(geometry.firstLineX + geometry.firstLineWidth) : geometry.firstLineX;
  const markerEnd = rtl ? -options.markerX : options.markerX + options.markerWidth;
  const required = markerEnd + options.suffixAdvance;
  const levelStart = options.levelBodyStartX === undefined ? required
    : rtl ? -options.levelBodyStartX : options.levelBodyStartX;
  const rebound = options.collisionPolicy === "word-compatible" ? Math.max(levelStart, required) : required;
  const start = Math.min(end - minimumTextWidth, requested >= required ? requested : rebound);
  const firstLineX = rtl ? geometry.x : start;
  const firstLineWidth = Math.max(minimumTextWidth, end - start);

  return {
    ...geometry,
    firstLineX,
    firstLineWidth,
    signature: [geometry.x, geometry.width, firstLineX, firstLineWidth]
      .map((value) => value.toFixed(4))
      .join(":")
  };
}
