import type { DecorationAttrs } from "@quirekit/pm";
import {
  parseDecorationPositiveNumber,
  parseDecorationStyleAttribute,
  readDecorationStringAttr
} from "./parse";
import { resolveMetricAffectingFontHints } from "./font-hints";
import { resolveTextDecoration } from "./text-decoration";
import type {
  QuireDecorationGutterMarkerSide,
  QuireDecorationOutlineStyle,
  QuireDecorationPointMarkerShape,
  QuireResolvedDecorationStyle
} from "../types";

/**
 * Resolves style and data attributes into renderer-neutral decoration style.
 *
 * @param attrs - Decoration attributes to inspect.
 * @returns Resolved style from inline attributes.
 */
export function resolveInlineDecorationStyle(
  attrs: DecorationAttrs
): QuireResolvedDecorationStyle {
  const styleMap = parseDecorationStyleAttribute(attrs.style);
  const cursor = styleMap.get("cursor");
  const background =
    readDecorationStringAttr(attrs, "data-qk-decoration-fill") ??
    readDecorationStringAttr(attrs, "data-qk-fill") ??
    readDecorationStringAttr(attrs, "data-qk-decoration-background") ??
    styleMap.get("background-color") ??
    styleMap.get("background");
  const textColor =
    readDecorationStringAttr(attrs, "data-qk-decoration-text-color") ??
    readDecorationStringAttr(attrs, "data-qk-text-color") ??
    styleMap.get("color");
  const outlineColor =
    readDecorationStringAttr(attrs, "data-qk-decoration-stroke") ??
    readDecorationStringAttr(attrs, "data-qk-stroke") ??
    readDecorationStringAttr(attrs, "data-qk-decoration-outline") ??
    styleMap.get("border-color") ??
    styleMap.get("outline-color");
  const outlineWidth = parseDecorationPositiveNumber(
    readDecorationStringAttr(attrs, "data-qk-decoration-stroke-width") ??
      readDecorationStringAttr(attrs, "data-qk-stroke-width") ??
      styleMap.get("border-width") ??
      styleMap.get("outline-width")
  );
  const outlineStyle = resolveDecorationOutlineStyle(
    readDecorationStringAttr(attrs, "data-qk-decoration-outline-style") ??
      styleMap.get("outline-style") ??
      styleMap.get("border-style")
  );
  const keylineColor =
    readDecorationStringAttr(attrs, "data-qk-decoration-keyline") ??
    styleMap.get("border-bottom-color");
  const keylineWidth = parseDecorationPositiveNumber(
    readDecorationStringAttr(attrs, "data-qk-decoration-keyline-width") ??
      styleMap.get("border-bottom-width")
  );
  const endIndicatorColor = readDecorationStringAttr(
    attrs,
    "data-qk-decoration-end-indicator"
  );
  const endIndicatorWidth = parseDecorationPositiveNumber(
    readDecorationStringAttr(
      attrs,
      "data-qk-decoration-end-indicator-width"
    )
  );
  const endIndicatorLength = parseDecorationPositiveNumber(
    readDecorationStringAttr(
      attrs,
      "data-qk-decoration-end-indicator-length"
    )
  );
  const pointMarkerColor = readDecorationStringAttr(
    attrs,
    "data-qk-decoration-point-marker"
  );
  const pointMarkerSize = parseDecorationPositiveNumber(
    readDecorationStringAttr(attrs, "data-qk-decoration-point-marker-size")
  );
  const pointMarkerWidth = parseDecorationPositiveNumber(
    readDecorationStringAttr(attrs, "data-qk-decoration-point-marker-width")
  );
  const pointMarkerShape = resolvePointMarkerShape(
    readDecorationStringAttr(attrs, "data-qk-decoration-point-marker-shape")
  );
  const gutterMarkerColor = readDecorationStringAttr(
    attrs,
    "data-qk-decoration-gutter-marker"
  );
  const gutterMarkerWidth = parseDecorationPositiveNumber(
    readDecorationStringAttr(attrs, "data-qk-decoration-gutter-marker-width")
  );
  const gutterMarkerOffset = parseDecorationPositiveNumber(
    readDecorationStringAttr(attrs, "data-qk-decoration-gutter-marker-offset")
  );
  const gutterMarkerSide = resolveDecorationGutterMarkerSide(
    readDecorationStringAttr(
      attrs,
      "data-qk-decoration-gutter-marker-side"
    )
  );
  const gutterMarkerTokenSizeValue = readDecorationStringAttr(
    attrs,
    "data-qk-decoration-gutter-token-size"
  );
  const gutterMarkerTokenSize = gutterMarkerTokenSizeValue === "0"
    ? 0
    : parseDecorationPositiveNumber(gutterMarkerTokenSizeValue);
  const textDecoration = resolveTextDecoration(attrs, styleMap, textColor);
  const fontHints = resolveMetricAffectingFontHints(styleMap);

  return {
    ...(cursor === undefined ? {} : { cursor }),
    ...(background === undefined ? {} : { background }),
    ...(keylineColor === undefined
      ? {}
      : { keyline: { color: keylineColor, width: keylineWidth ?? 1 } }),
    ...(endIndicatorColor === undefined
      ? {}
      : {
          endIndicator: {
            color: endIndicatorColor,
            width: endIndicatorWidth ?? 1,
            length: endIndicatorLength ?? 8
          }
        }),
    ...(pointMarkerColor === undefined
      ? {}
      : {
          pointMarker: {
            ...(pointMarkerShape === undefined ? {} : { shape: pointMarkerShape }),
            color: pointMarkerColor,
            size: pointMarkerSize ?? 12,
            lineWidth: pointMarkerWidth ?? 1.25
          }
        }),
    ...(gutterMarkerColor === undefined
      ? {}
      : {
          gutterMarker: {
            color: gutterMarkerColor,
            width: gutterMarkerWidth ?? 2,
            side: gutterMarkerSide ?? "end",
            offset: gutterMarkerOffset ?? 6,
            tokenSize: gutterMarkerTokenSize ?? 4
          }
        }),
    ...(textColor === undefined ? {} : { textColor }),
    ...(textDecoration.length === 0 ? {} : { textDecoration }),
    ...(outlineColor === undefined
      ? {}
      : {
          outline: {
            color: outlineColor,
            width: outlineWidth ?? 1,
            ...(outlineStyle === undefined ? {} : { style: outlineStyle })
          }
        }),
    ...(fontHints === undefined ? {} : { fontHints })
  };
}

/**
 * Resolves the physical page-body side admitted by the gutter contract.
 *
 * @param value - Decoration data attribute value.
 * @returns Canonical side, or undefined for unsupported values.
 */
function resolveDecorationGutterMarkerSide(
  value: string | undefined
): QuireDecorationGutterMarkerSide | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized === "start" || normalized === "end"
    ? normalized
    : undefined;
}

/**
 * Resolves the CSS-like outline style subset supported by display backends.
 *
 * @param value - Decoration data attribute or parsed CSS style value.
 * @returns Canonical outline style, or undefined for unsupported values.
 */
function resolveDecorationOutlineStyle(
  value: string | undefined
): QuireDecorationOutlineStyle | undefined {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "solid"
    || normalized === "dashed"
    || normalized === "dotted"
  ) {
    return normalized;
  }
  return undefined;
}

/**
 * @param value - Raw `data-qk-decoration-point-marker-shape` attribute.
 * @returns Known marker shape, or undefined for the default speech bubble.
 */
function resolvePointMarkerShape(value: string | undefined): QuireDecorationPointMarkerShape | undefined {
  return value === "open-bracket" || value === "close-bracket" || value === "insertion-bar"
    || value === "speech-bubble" ? value : undefined;
}
