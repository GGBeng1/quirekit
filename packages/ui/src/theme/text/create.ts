import type { QuireKitSemanticTextTokens, QuireKitThemeColorScales } from "../types";

/**
 * Maps the reviewed neutral ramp into text hierarchy and scene roles.
 * @param scale - Neutral palette shared by text, borders and surfaces.
 * @param accent - Existing product accent foreground.
 * @param onAccent - Readable foreground of the solid product action.
 * @returns Immutable semantic aliases with no interpolated colors or opacity.
 */
export function createTextTokens(
  scale: QuireKitThemeColorScales["neutral"],
  accent: string,
  onAccent: string
): QuireKitSemanticTextTokens {
  return Object.freeze({
    primary: scale[11],
    secondary: scale[10],
    tertiary: scale[9],
    muted: scale[8],
    placeholder: scale[7],
    accent,
    disabled: scale[7],
    inverse: scale[1],
    onAccent
  });
}
