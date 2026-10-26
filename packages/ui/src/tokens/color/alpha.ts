import type { QuireKitColorStep } from "../types";
import {
  clampColorNumber,
  formatQuireRgbAlpha,
  parseQuireHexColor,
  type QuireSrgbColor
} from "./conversion";
import { quireKitColorSteps, type QuireKitGeneratedColorScale } from "./generate";

/**
 * Builds a transparent scale that recreates each solid step over its page background.
 *
 * @param scale - Solid eleven-step scale.
 * @param background - Opaque page background used for reverse compositing.
 * @returns Immutable alpha scale keyed from one through eleven.
 */
export function generateQuireKitAlphaScale(
  scale: QuireKitGeneratedColorScale,
  background: string
): QuireKitGeneratedColorScale {
  const backdrop = parseQuireHexColor(background);
  const result = {} as Record<QuireKitColorStep, string>;
  for (const step of quireKitColorSteps) {
    const target = parseQuireHexColor(scale[step]);
    const alpha = step === 1
      ? 0
      : resolveMinimumAlpha(target, backdrop);
    result[step] = formatQuireRgbAlpha(resolveForeground(target, backdrop, alpha), alpha);
  }
  return Object.freeze(result);
}

/**
 * Finds the smallest alpha whose reverse-composited foreground remains in sRGB.
 *
 * @param target - Desired opaque appearance.
 * @param background - Owning page background.
 * @returns Alpha rounded upward to a stable percentage-friendly value.
 */
function resolveMinimumAlpha(target: QuireSrgbColor, background: QuireSrgbColor): number {
  const channelAlpha = (targetChannel: number, backgroundChannel: number): number => {
    const difference = targetChannel - backgroundChannel;
    // Ignore sub-perceptual two-channel quantization noise so one near-white
    // channel cannot force an otherwise quiet alpha surface to full opacity.
    if (Math.abs(difference) <= 2 / 255) return 0;
    return difference > 0
      ? difference / Math.max(0.000001, 1 - backgroundChannel)
      : -difference / Math.max(0.000001, backgroundChannel);
  };
  const minimum = Math.max(
    channelAlpha(target.r, background.r),
    channelAlpha(target.g, background.g),
    channelAlpha(target.b, background.b)
  );
  return clampColorNumber(Math.ceil((minimum + 0.005) * 100) / 100, 0.01, 1);
}

/**
 * Reconstructs the foreground that produces a target after alpha compositing.
 *
 * @param target - Desired opaque appearance.
 * @param background - Owning page background.
 * @param alpha - Selected alpha value.
 * @returns Normalized sRGB foreground channels.
 */
function resolveForeground(
  target: QuireSrgbColor,
  background: QuireSrgbColor,
  alpha: number
): QuireSrgbColor {
  if (alpha === 0) return background;
  const channel = (targetChannel: number, backgroundChannel: number): number =>
    clampColorNumber((targetChannel - (1 - alpha) * backgroundChannel) / alpha);
  return {
    r: channel(target.r, background.r),
    g: channel(target.g, background.g),
    b: channel(target.b, background.b)
  };
}
