import { additionalNeutralPalettes } from "./neutral-palettes";
import type {
  QuireKitBaseColorTokens,
  QuireKitColorRamp,
  QuireKitColorScheme,
  QuireKitColorStep,
  QuireKitNeutralPalette
} from "../types";
import {
  formatQuireHexColor,
  parseQuireHexColor,
  quireContrastRatio,
  quireOklchToSrgb,
  quireSrgbToOklch,
  type QuireOklchColor
} from "./conversion";

/** Ordered color steps shared by solid, alpha, and documentation projections. */
export const quireKitColorSteps = Object.freeze([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
] as const);

/** Upper bound of the OKLCH source lightness from which surface steps are derived. */
const surfaceAnchorLightness = 0.6;

/** Eleven-step generated palette keyed by source-centered scale position. */
export type QuireKitGeneratedColorScale = Readonly<Record<QuireKitColorStep, string>>;

/** Options that control one chromatic OKLCH palette generation. */
export interface GenerateQuireKitColorScaleOptions {
  /** Minimum contrast required for strong candidates; the source anchor is preserved. */
  readonly minimumSolidContrast?: number | undefined;
  /** Neutral page background used by border contrast gates. */
  readonly background?: string | undefined;
}

/**
 * Generates an eleven-step, source-centered chromatic palette.
 *
 * The source occupies step six, leaving five perceptually reviewed positions
 * on either side. Semantic roles are selected later and do not redefine the
 * source as a numbered component state.
 *
 * @param source - Three- or six-digit sRGB source color.
 * @param scheme - Owning light or dark color scheme.
 * @param tokens - Approved base color-token contract.
 * @param options - Optional contrast override for validation fixtures.
 * @returns Immutable generated palette keyed from one through eleven.
 */
export function generateQuireKitColorScale(
  source: string,
  scheme: QuireKitColorScheme,
  tokens: QuireKitBaseColorTokens,
  options: GenerateQuireKitColorScaleOptions = {}
): QuireKitGeneratedColorScale {
  const minimumContrast = options.minimumSolidContrast
    ?? tokens.minimumSolidContrast;
  if (!Number.isFinite(minimumContrast) || minimumContrast < 3 || minimumContrast > 21) {
    throw new RangeError("minimumSolidContrast must be between 3 and 21");
  }

  const sourceHex = formatQuireHexColor(parseQuireHexColor(source));
  const reviewed = tokens.palettes?.[sourceHex]?.[scheme];
  const seed = quireSrgbToOklch(parseQuireHexColor(source));
  const curve = scheme === "light" ? tokens.curveLight : tokens.curveDark;
  const result = {} as Record<QuireKitColorStep, string>;
  for (const [index, step] of quireKitColorSteps.entries()) {
    const lightness = resolveLightness(
      resolveSurfaceAnchor(seed.l, step, tokens.sourceStep),
      curve.lightnessShift[index]!,
      step,
      tokens.sourceStep,
      scheme
    );
    result[step] = reviewed
      ? formatQuireHexColor(parseQuireHexColor(reviewed[index]!))
      : project(seed, lightness, seed.c * curve.chroma[index]!);
  }

  // Keep the reviewed source as the palette identity; semantic roles reference fixed palette steps.
  const background = options.background ?? result[1];
  result[tokens.sourceStep] = sourceHex;

  // Stronger candidates receive contrast gates without mutating the source anchor.
  for (const [step, contrast] of [[8, minimumContrast], [9, 4.5], [10, 5.5], [11, 7]] as const) {
    // Reviewed ramps retain their local hue when a contrast gate adjusts lightness.
    const candidateSeed = reviewed ? quireSrgbToOklch(parseQuireHexColor(result[step])) : seed;
    result[step] = solveContrast(candidateSeed, result[step], background, contrast, scheme);
  }
  return Object.freeze(result);
}

/**
 * Resolves the manually reviewed neutral palette for one scheme.
 *
 * @param scheme - Owning light or dark color scheme.
 * @param tokens - Approved base color-token contract.
 * @param palette - Manually reviewed neutral palette identity.
 * @returns Immutable neutral palette keyed from one through eleven.
 */
export function resolveQuireKitNeutralScale(
  scheme: QuireKitColorScheme,
  tokens: QuireKitBaseColorTokens,
  palette: QuireKitNeutralPalette = "precision"
): QuireKitGeneratedColorScale {
  const ramp: QuireKitColorRamp = palette === "slate" || palette === "stone"
    ? (tokens.neutralPalettes?.[palette] ?? additionalNeutralPalettes[palette])[scheme]
    : palette === "ink"
    ? (scheme === "light" ? tokens.inkNeutralLight : tokens.inkNeutralDark)
    : (scheme === "light" ? tokens.neutralLight : tokens.neutralDark);
  const result = {} as Record<QuireKitColorStep, string>;
  for (const [index, step] of quireKitColorSteps.entries()) result[step] = ramp[index]!;
  return Object.freeze(result);
}

/**
 * Caps the lightness anchor of surface-side steps so light sources (amber, yellow) keep the same
 * quiet surface weight as other hues. The cap applies fully at step one and fades out toward the source.
 *
 * @param sourceLightness - Perceptual lightness of the reviewed source color.
 * @param step - Current palette step.
 * @param sourceStep - Step that preserves the reviewed source color.
 * @returns Lightness from which the step is derived.
 */
function resolveSurfaceAnchor(
  sourceLightness: number,
  step: QuireKitColorStep,
  sourceStep: QuireKitColorStep
): number {
  if (step >= sourceStep || sourceLightness <= surfaceAnchorLightness) return sourceLightness;
  const weight = (sourceStep - step) / (sourceStep - 1);
  return sourceLightness - (sourceLightness - surfaceAnchorLightness) * weight;
}

/**
 * Moves a palette role from the source toward the scheme endpoint.
 *
 * @param sourceLightness - Perceptual lightness of the reviewed source color.
 * @param shift - Fractional distance from the source toward the selected endpoint.
 * @param step - Current palette step.
 * @param sourceStep - Step that preserves the reviewed source color.
 * @param scheme - Owning light or dark color scheme.
 * @returns Perceptual lightness for the current step.
 */
function resolveLightness(
  sourceLightness: number,
  shift: number,
  step: QuireKitColorStep,
  sourceStep: QuireKitColorStep,
  scheme: QuireKitColorScheme
): number {
  if (step === sourceStep) return sourceLightness;
  const movesTowardWhite = scheme === "light"
    ? step < sourceStep
    : step > sourceStep;
  return movesTowardWhite
    ? sourceLightness + (1 - sourceLightness) * shift
    : sourceLightness * (1 - shift);
}

/**
 * Projects one OKLCH source into the sRGB gamut.
 *
 * @param seed - Source hue and base chroma.
 * @param lightness - Target perceptual lightness.
 * @param chroma - Target perceptual chroma.
 * @returns Six-digit sRGB hexadecimal color.
 */
function project(seed: QuireOklchColor, lightness: number, chroma: number): string {
  return formatQuireHexColor(quireOklchToSrgb({ l: lightness, c: chroma, h: seed.h }));
}

/**
 * Finds the closest serialized lightness that satisfies a contrast threshold.
 *
 * @param seed - Source hue and base chroma.
 * @param initial - Initial serialized candidate.
 * @param background - Owning scheme background.
 * @param minimum - Required WCAG contrast ratio.
 * @param scheme - Direction in which contrast is solved.
 * @returns Serialized passing color.
 */
function solveContrast(
  seed: QuireOklchColor,
  initial: string,
  background: string,
  minimum: number,
  scheme: QuireKitColorScheme
): string {
  const backgroundColor = parseQuireHexColor(background);
  if (quireContrastRatio(parseQuireHexColor(initial), backgroundColor) >= minimum) return initial;
  const initialOklch = quireSrgbToOklch(parseQuireHexColor(initial));
  let passing = scheme === "light" ? 0 : 1;
  let failing = initialOklch.l;
  for (let iteration = 0; iteration < 30; iteration += 1) {
    const lightness = (passing + failing) / 2;
    const candidate = project(seed, lightness, initialOklch.c);
    if (quireContrastRatio(parseQuireHexColor(candidate), backgroundColor) >= minimum) passing = lightness;
    else failing = lightness;
  }
  return project(seed, passing, initialOklch.c);
}
