import type { QuireDecorationFontHints } from "../types";

/**
 * Detects font styles that would desync paint-phase decoration geometry.
 *
 * @param styleMap - Parsed inline style map.
 * @returns Font hints when metric-affecting styles are present.
 */
export function resolveMetricAffectingFontHints(
  styleMap: ReadonlyMap<string, string>
): QuireDecorationFontHints | undefined {
  const fontFamily = styleMap.get("font-family");
  const fontSize = styleMap.get("font-size");
  const fontWeight = styleMap.get("font-weight");
  const fontStyle = styleMap.get("font-style");

  if (
    fontFamily === undefined &&
    fontSize === undefined &&
    fontWeight === undefined &&
    fontStyle === undefined
  ) {
    return undefined;
  }

  return {
    ...(fontFamily === undefined ? {} : { fontFamily }),
    ...(fontSize === undefined ? {} : { fontSize }),
    ...(fontWeight === undefined ? {} : { fontWeight }),
    ...(fontStyle === undefined ? {} : { fontStyle })
  };
}
