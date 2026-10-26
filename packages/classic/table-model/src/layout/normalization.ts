import type { WordTableGridOffsetRef, WordTableGridRect, WordTableMapDiagnostic } from "../map/types";
import type { WordTableBorder, WordTableBorders, WordTableCellMargins, WordTableLayout, WordTableRowHeight, WordTableShading, WordTableWidth } from "../types";
import type {
  QuireTableBorder,
  QuireTableBorders,
  QuireTableCellMargins,
  QuireTableDiagnostic,
  QuireTableGridOffset,
  QuireTableGridRect,
  QuireTableLayoutMode,
  QuireTableLength,
  QuireTableRowHeight,
  QuireTableShading
} from "@quirekit/layout/table";

const cssPixelsPerPoint = 96 / 72;

/**
 * Normalizes a Word table length before it enters consumer-neutral layout.
 *
 * @param width - Word-compatible source length.
 * @returns Canonical table length, or null when the source length is absent.
 */
export function normalizeWordTableLength(
  width: WordTableWidth | null
): QuireTableLength | null {
  if (width === null) {
    return null;
  }

  if (width.unit === "dxa") {
    return {
      unit: "px",
      value: width.value === null ? null : width.value / 15
    };
  }
  if (width.unit === "pct") {
    return {
      unit: "percent",
      value: width.value === null ? null : width.value / 5000
    };
  }
  if (width.unit === "nil") {
    return { unit: "none", value: null };
  }

  return {
    unit: width.unit,
    value: width.value
  };
}

/**
 * Normalizes a Word table layout policy.
 *
 * @param layout - Word-compatible layout policy.
 * @returns Canonical table layout policy.
 */
export function normalizeWordTableLayoutMode(
  layout: WordTableLayout | null
): QuireTableLayoutMode {
  // WordprocessingML defaults an omitted w:tblLayout to auto-fit. Resolve the
  // default at the Word adapter boundary so neutral layout never has to infer
  // source-format semantics from a nullable policy.
  return layout === "fixed" ? "fixed" : "auto-fit";
}

/**
 * Normalizes one Word row height to CSS pixels.
 *
 * @param height - Word-compatible row height.
 * @returns Canonical row height, or null when absent.
 */
export function normalizeWordTableRowHeight(
  height: WordTableRowHeight | null
): QuireTableRowHeight | null {
  if (height === null) {
    return null;
  }

  return {
    value: height.value / 15,
    rule: height.rule === "atLeast" ? "at-least" : height.rule
  };
}

/**
 * Normalizes one Word border to CSS-pixel geometry.
 *
 * @param border - Word-compatible border value.
 * @returns Canonical border, or null when absent.
 */
export function normalizeWordTableBorder(
  border: WordTableBorder | null
): QuireTableBorder | null {
  if (border === null) {
    return null;
  }

  return {
    style: border.style,
    width: border.size === null ? null : border.size / 6,
    color: border.color,
    spacing: border.space === null ? null : border.space * cssPixelsPerPoint
  };
}

/**
 * Normalizes a complete Word table border map.
 *
 * @param borders - Word-compatible border map.
 * @returns Canonical border map, or null when absent.
 */
export function normalizeWordTableBorders(
  borders: WordTableBorders | null
): QuireTableBorders | null {
  if (borders === null) {
    return null;
  }

  return {
    top: normalizeWordTableBorder(borders.top),
    right: normalizeWordTableBorder(borders.right),
    bottom: normalizeWordTableBorder(borders.bottom),
    left: normalizeWordTableBorder(borders.left),
    insideH: normalizeWordTableBorder(borders.insideH),
    insideV: normalizeWordTableBorder(borders.insideV),
    ...(borders.tl2br === undefined
      ? {}
      : { tl2br: normalizeWordTableBorder(borders.tl2br) }),
    ...(borders.tr2bl === undefined
      ? {}
      : { tr2bl: normalizeWordTableBorder(borders.tr2bl) })
  };
}

/**
 * Normalizes Word table cell margins.
 *
 * @param margins - Word-compatible cell margins.
 * @returns Canonical margins, or null when absent.
 */
export function normalizeWordTableCellMargins(
  margins: WordTableCellMargins | null
): QuireTableCellMargins | null {
  if (margins === null) {
    return null;
  }

  return {
    top: normalizeWordTableLength(margins.top),
    right: normalizeWordTableLength(margins.right),
    bottom: normalizeWordTableLength(margins.bottom),
    left: normalizeWordTableLength(margins.left)
  };
}

/**
 * Copies source shading into the neutral table contract.
 *
 * @param shading - Word-compatible shading.
 * @returns Canonical shading, or null when absent.
 */
export function normalizeWordTableShading(
  shading: WordTableShading | null
): QuireTableShading | null {
  return shading === null ? null : { ...shading };
}

/**
 * Copies a source grid rectangle into the neutral table contract.
 *
 * @param rect - Word table grid rectangle.
 * @returns Canonical grid rectangle.
 */
export function normalizeWordTableGridRect(
  rect: WordTableGridRect
): QuireTableGridRect {
  return { ...rect };
}

/**
 * Copies a source row offset into the neutral table contract.
 *
 * @param offset - Word table row offset.
 * @returns Canonical grid offset.
 */
export function normalizeWordTableGridOffset(
  offset: WordTableGridOffsetRef
): QuireTableGridOffset {
  return { ...offset };
}

/**
 * Copies a source map diagnostic into the neutral table contract.
 *
 * @param diagnostic - Word table-map diagnostic.
 * @returns Canonical table diagnostic.
 */
export function normalizeWordTableDiagnostic(
  diagnostic: WordTableMapDiagnostic
): QuireTableDiagnostic {
  return {
    ...diagnostic,
    range: diagnostic.range === null ? null : { ...diagnostic.range },
    rect: diagnostic.rect === null ? null : { ...diagnostic.rect }
  };
}
