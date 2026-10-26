import { parseQuireHexColor, quireContrastRatio } from "../tokens";
import type { QuireKitSemanticFeedbackTokens, QuireKitTheme, QuireKitThemeColorScales } from "./types";

/**
 * Maps one chromatic palette to feedback roles.
 *
 * @param scale - Generated chromatic palette.
 * @param scheme - Owning color scheme used to select readable quiet surfaces.
 * @returns Immutable feedback-token group.
 */
export function createFeedback(
  scale: QuireKitThemeColorScales["info"],
  scheme: QuireKitTheme["scheme"]
): QuireKitSemanticFeedbackTokens {
  const surface = scale[1];
  const hoverSurface = scale[2];
  const pressedSurface = scale[3];
  const backgrounds = [surface, hoverSurface, pressedSurface];
  const text = scheme === "light"
    ? resolveFeedbackForeground(scale, backgrounds)
    : selectReadableForeground([scale[9], scale[10], scale[11], scale[6], scale[7], scale[8]], backgrounds);
  return Object.freeze({
    surface,
    hoverSurface,
    pressedSurface,
    border: scale[7],
    text,
    foreground: text,
    solid: scale[6],
    onSolid: chooseReadableForeground(scale[6])
  });
}

/**
 * Selects source-near text, extending the family before considering neutral fallback.
 *
 * @param scale - Generated feedback palette anchored at step six.
 * @param backgrounds - Every surface the fixed text must remain readable against.
 * @param maximumStep - Last available same-family text candidate.
 * @returns First passing candidate, or the candidate with the best minimum contrast.
 */
export function resolveFeedbackForeground(
  scale: QuireKitThemeColorScales["info"],
  backgrounds: string | readonly string[],
  maximumStep: 8 | 11 = 11
): string {
  const candidates = ([6, 7, 8, 9, 10, 11] as const)
    .filter(step => step <= maximumStep)
    .map(step => scale[step]);
  return selectReadableForeground(candidates, typeof backgrounds === "string" ? [backgrounds] : backgrounds);
}

/**
 * Keeps one foreground across states and ranks custom palettes by their weakest pair.
 * @param candidates - Same-family colors in preferred visual order.
 * @param backgrounds - Complete background state set.
 * @returns First passing family or neutral candidate, otherwise the strongest minimum.
 */
function selectReadableForeground(candidates: readonly string[], backgrounds: readonly string[]): string {
  const surfaces = backgrounds.map(parseQuireHexColor);
  let best = "#000000";
  let bestContrast = -1;
  // Prefer the existing family identity; neutral extremes only rescue a palette
  // with no readable family member. Check all states even when their order is custom.
  for (const candidate of [...candidates, "#000000", "#ffffff"]) {
    const color = parseQuireHexColor(candidate);
    const contrast = Math.min(...surfaces.map(surface => quireContrastRatio(color, surface)));
    if (contrast >= 4.5) {
      return candidate;
    }
    if (contrast > bestContrast) {
      best = candidate;
      bestContrast = contrast;
    }
  }
  return best;
}

/**
 * Prefers white solid labels once they meet normal-text contrast, otherwise black.
 *
 * @param background - Six-digit sRGB background.
 * @returns White at 4.5:1 or above, otherwise the higher-contrast candidate.
 */
export function chooseReadableForeground(background: string): string {
  const value = parseQuireHexColor(background);
  const white = quireContrastRatio(value, parseQuireHexColor("#ffffff"));
  const black = quireContrastRatio(value, parseQuireHexColor("#000000"));
  return white >= 4.5 || white >= black ? "#ffffff" : "#000000";
}
