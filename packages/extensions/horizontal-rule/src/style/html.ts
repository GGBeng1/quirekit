import type {
  HorizontalRuleStyle,
  HorizontalRuleVariant
} from "../types";
import { defaultHorizontalRuleStyle } from "./defaults";
import { normalizeHorizontalRuleStyle } from "./normalize";

/**
 * Creates HTML data attributes and CSS for one canonical rule style.
 *
 * @param style - Complete normalized rule style.
 * @returns Serializable HTML attributes.
 */
export function serializeHorizontalRuleHtml(
  style: HorizontalRuleStyle
): Readonly<Record<string, string>> {
  const width = `${style.widthPercent}%`;
  const marginInline = style.alignment === "center"
    ? "auto"
    : style.alignment === "right"
      ? "auto 0"
      : "0 auto";
  return {
    "data-qk-horizontal-rule-variant": style.variant,
    "data-qk-horizontal-rule-color": style.color,
    "data-qk-horizontal-rule-thickness-pt": String(style.thicknessPt),
    "data-qk-horizontal-rule-width-percent": String(style.widthPercent),
    "data-qk-horizontal-rule-alignment": style.alignment,
    style: [
      "border: 0",
      `width: ${width}`,
      `margin-inline: ${marginInline}`,
      ...createRuleCss(style)
    ].join("; ")
  };
}

/**
 * Reads canonical style attributes from one HTML horizontal rule.
 *
 * @param element - Parsed HTML element.
 * @param fallback - Complete extension-owned fallback style.
 * @returns Normalized rule style.
 */
export function parseHorizontalRuleHtml(
  element: HTMLElement,
  fallback: HorizontalRuleStyle = defaultHorizontalRuleStyle
): HorizontalRuleStyle {
  const widthAttribute = element.getAttribute("data-qk-horizontal-rule-width-percent")
    ?? element.getAttribute("width");
  const thicknessAttribute =
    element.getAttribute("data-qk-horizontal-rule-thickness-pt")
    ?? element.getAttribute("size");
  const inlineStyle = element.style;
  const variant = element.getAttribute("data-qk-horizontal-rule-variant")
    ?? readVariantFromCss(inlineStyle.borderTopStyle);
  return normalizeHorizontalRuleStyle({
    variant,
    color: element.getAttribute("data-qk-horizontal-rule-color")
      ?? element.getAttribute("color")
      ?? inlineStyle.borderTopColor
      ?? fallback.color,
    thicknessPt: readNumericAttribute(thicknessAttribute),
    widthPercent: readNumericAttribute(widthAttribute),
    alignment: element.getAttribute("data-qk-horizontal-rule-alignment")
      ?? element.getAttribute("align")
  }, fallback);
}

/**
 * Creates CSS declarations for one line family.
 *
 * @param style - Complete normalized rule style.
 * @returns CSS declarations appended to the base rule style.
 */
function createRuleCss(style: HorizontalRuleStyle): readonly string[] {
  const px = Math.max(1, style.thicknessPt * (96 / 72));
  if (style.variant === "shaded") {
    return [
      `height: ${px}px`,
      `background: ${style.color}`,
      "box-shadow: inset 0 1px rgb(255 255 255 / 55%), inset 0 -1px rgb(0 0 0 / 35%)"
    ];
  }
  return [
    "height: 0",
    `border-top: ${px}px ${style.variant === "single" ? "solid" : style.variant} ${style.color}`
  ];
}

/**
 * Reads a finite number from plain or percentage HTML input.
 *
 * @param value - Raw attribute text.
 * @returns Parsed finite number, or undefined.
 */
function readNumericAttribute(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Maps a CSS border style to the canonical variant.
 *
 * @param value - CSS border style.
 * @returns Canonical variant when the CSS style is meaningful.
 */
function readVariantFromCss(value: string): HorizontalRuleVariant | undefined {
  return value === "double" || value === "dotted" || value === "dashed"
    ? value
    : value === "solid"
      ? "single"
      : undefined;
}
