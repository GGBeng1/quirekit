import type { QuireKitColorScheme } from "../../types";
import {
  clampColorNumber,
  decodeSrgbChannel,
  encodeLinearChannel
} from "./channels";
import type { QuireOklchColor, QuireSrgbColor } from "./types";

/**
 * Converts normalized sRGB into OKLCH.
 *
 * @param color - Normalized sRGB source.
 * @returns Perceptual OKLCH coordinates.
 */
export function quireSrgbToOklch(color: QuireSrgbColor): QuireOklchColor {
  const r = decodeSrgbChannel(color.r);
  const g = decodeSrgbChannel(color.g);
  const b = decodeSrgbChannel(color.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const yellowBlue = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const chroma = Math.sqrt(a * a + yellowBlue * yellowBlue);
  return {
    l: lightness,
    c: chroma,
    h: chroma < 0.000001 ? 0 : (Math.atan2(yellowBlue, a) * 180 / Math.PI + 360) % 360
  };
}

/**
 * Maps OKLCH into the sRGB gamut by reducing chroma.
 *
 * @param color - Perceptual source color.
 * @returns In-gamut normalized sRGB channels.
 */
export function quireOklchToSrgb(color: QuireOklchColor): QuireSrgbColor {
  const lightness = clampColorNumber(color.l);
  let low = 0;
  let high = Math.max(0, color.c);
  let linear = toLinear({ ...color, l: lightness, c: high });
  if (!isInGamut(linear)) {
    for (let iteration = 0; iteration < 28; iteration += 1) {
      const candidateChroma = (low + high) / 2;
      const candidate = toLinear({ ...color, l: lightness, c: candidateChroma });
      if (isInGamut(candidate)) {
        low = candidateChroma;
        linear = candidate;
      } else {
        high = candidateChroma;
      }
    }
  }
  return {
    r: clampColorNumber(encodeLinearChannel(linear.r)),
    g: clampColorNumber(encodeLinearChannel(linear.g)),
    b: clampColorNumber(encodeLinearChannel(linear.b))
  };
}

/**
 * Reports the required luminance direction for a scheme scale.
 *
 * @param scheme - Owning color scheme.
 * @returns Negative one for light themes and positive one for dark themes.
 */
export function quireSchemeDirection(scheme: QuireKitColorScheme): -1 | 1 {
  return scheme === "light" ? -1 : 1;
}

/**
 * Converts OKLCH coordinates to unclamped linear sRGB channels.
 *
 * @param color - Perceptual OKLCH source.
 * @returns Linear sRGB channels which may fall outside the display gamut.
 */
function toLinear(color: QuireOklchColor): QuireSrgbColor {
  const hue = color.h * Math.PI / 180;
  const a = color.c * Math.cos(hue);
  const b = color.c * Math.sin(hue);
  const lPrime = color.l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = color.l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = color.l - 0.0894841775 * a - 1.291485548 * b;
  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;
  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  };
}

/**
 * Reports whether linear sRGB channels stay inside the display gamut.
 *
 * @param color - Unclamped linear sRGB channels.
 * @returns Whether every channel is within the tolerated zero-to-one interval.
 */
function isInGamut(color: QuireSrgbColor): boolean {
  const epsilon = 0.000001;
  return color.r >= -epsilon && color.r <= 1 + epsilon
    && color.g >= -epsilon && color.g <= 1 + epsilon
    && color.b >= -epsilon && color.b <= 1 + epsilon;
}
