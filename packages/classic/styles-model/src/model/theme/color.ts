import { scanOoxmlXmlElements } from "./font-theme/xml";
import type { WordStyleColorReference } from "../text/types";

/** @param xml - DrawingML theme. @param settings - Word settings. @returns RGB slots including document color-map aliases. */
export function readWordThemeColors(xml: string, settings: string): Readonly<Record<string, string>> {
  const colors: Record<string, string> = {};
  for (const element of scanOoxmlXmlElements(xml)) {
    const parent = element.ancestors.at(-1);
    if (element.ancestors.at(-2)?.localName !== "clrScheme" || !parent) continue;
    const value = element.localName === "srgbClr" ? element.attributes.val
      : element.localName === "sysClr" ? element.attributes.lastClr : undefined;
    if (value && /^[a-f\d]{6}$/iu.test(value)) colors[parent.localName] = value;
  }
  const mapping = scanOoxmlXmlElements(settings).find(element => element.localName === "clrSchemeMapping")?.attributes ?? {};
  const aliases: Record<string, string> = { dark1: "dk1", dark2: "dk2", light1: "lt1", light2: "lt2", hyperlink: "hlink", followedHyperlink: "folHlink" };
  for (const [alias, slot] of Object.entries(aliases)) if (colors[slot]) colors[alias] = colors[slot]!;
  for (const [alias, setting, fallback] of [["text1", "t1", "dark1"], ["text2", "t2", "dark2"],
    ["background1", "bg1", "light1"], ["background2", "bg2", "light2"]] as const) {
    const value = colors[mapping[setting] ?? fallback];
    if (value) colors[alias] = value;
  }
  return colors;
}

/**
 * Resolves a Word theme color using MS-OI29500 HSL luminance rules.
 * @param reference - Bound slot with optional byte tint/shade.
 * @param colors - Current theme RGB slots.
 * @returns CSS color, or undefined when the binding cannot be resolved.
 */
export function resolveWordThemeColor(reference: WordStyleColorReference, colors: Readonly<Record<string, string>>): string | undefined {
  const rgb = colors[reference.slot];
  if (!rgb) return undefined;
  const channels = [0, 2, 4].map(offset => Number.parseInt(rgb.slice(offset, offset + 2), 16) / 255);
  const low = Math.min(...channels), high = Math.max(...channels), spread = high - low;
  const lightness = (low + high) / 2;
  const saturation = spread === 0 ? 0 : spread / (1 - Math.abs(2 * lightness - 1));
  const tint = readByte(reference.tint), shade = readByte(reference.shade);
  const adjusted = tint !== undefined ? 1 - (1 - lightness) * tint : shade !== undefined ? lightness * shade : lightness;
  // Preserve hue and saturation by scaling chroma around the new lightness.
  const chroma = (1 - Math.abs(2 * adjusted - 1)) * saturation;
  const result = channels.map(value => adjusted + (spread === 0 ? 0 : (value - lightness) * chroma / spread));
  return `#${result.map(value => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, "0")).join("")}`;
}

/** @param value - Hexadecimal theme byte. @returns Normalized multiplier, or undefined. */
function readByte(value: string | undefined): number | undefined {
  return value !== undefined && /^[a-f\d]{2}$/iu.test(value) ? Number.parseInt(value, 16) / 255 : undefined;
}
