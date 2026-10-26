import type { HsvColor, RgbColor } from "./types";

/**
 * Keeps a numeric channel inside its supported value space.
 *
 * @param value - Candidate channel value.
 * @param minimum - Inclusive lower bound.
 * @param maximum - Inclusive upper bound.
 * @returns Clamped channel value.
 */
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Converts one canonical hexadecimal color into RGB channels.
 *
 * @param color - Six-digit hexadecimal color with a leading hash.
 * @returns Parsed RGB channels.
 */
export function hexToRgb(color: string): RgbColor {
  const value = color.slice(1);
  return {
    red: Number.parseInt(value.slice(0, 2), 16),
    green: Number.parseInt(value.slice(2, 4), 16),
    blue: Number.parseInt(value.slice(4, 6), 16)
  };
}

/**
 * Converts RGB channels into one canonical uppercase hexadecimal color.
 *
 * @param color - RGB channels to serialize.
 * @returns Six-digit hexadecimal color with a leading hash.
 */
export function rgbToHex(color: RgbColor): string {
  /**
   * Serializes one clamped integer channel.
   *
   * @param value - Candidate RGB channel.
   * @returns Two-digit hexadecimal channel.
   */
  const channel = (value: number): string => (
    Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0")
  );
  return `#${channel(color.red)}${channel(color.green)}${channel(color.blue)}`
    .toUpperCase();
}

/**
 * Converts RGB channels into the HSV editing value space.
 *
 * @param color - RGB channels to convert.
 * @returns Equivalent HSV channels.
 */
export function rgbToHsv(color: RgbColor): HsvColor {
  const red = clamp(color.red, 0, 255) / 255;
  const green = clamp(color.green, 0, 255) / 255;
  const blue = clamp(color.blue, 0, 255) / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  let hue = 0;
  if (delta > 0) {
    if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  return {
    hue: hue < 0 ? hue + 360 : hue,
    saturation: maximum === 0 ? 0 : (delta / maximum) * 100,
    value: maximum * 100
  };
}

/**
 * Converts HSV editing channels into RGB channels.
 *
 * @param color - HSV channels to convert.
 * @returns Equivalent RGB channels.
 */
export function hsvToRgb(color: HsvColor): RgbColor {
  const hue = ((color.hue % 360) + 360) % 360;
  const saturation = clamp(color.saturation, 0, 100) / 100;
  const value = clamp(color.value, 0, 100) / 100;
  const chroma = value * saturation;
  const segment = hue / 60;
  const intermediate = chroma * (1 - Math.abs((segment % 2) - 1));
  const offset = value - chroma;
  const [red, green, blue] = (
    segment < 1 ? [chroma, intermediate, 0]
      : segment < 2 ? [intermediate, chroma, 0]
        : segment < 3 ? [0, chroma, intermediate]
          : segment < 4 ? [0, intermediate, chroma]
            : segment < 5 ? [intermediate, 0, chroma]
              : [chroma, 0, intermediate]
  );
  return {
    red: (red + offset) * 255,
    green: (green + offset) * 255,
    blue: (blue + offset) * 255
  };
}

/**
 * Normalizes user-entered hexadecimal text without silently changing invalid colors.
 *
 * @param value - Candidate hexadecimal text, with or without a leading hash.
 * @returns Canonical color, or undefined when the input is incomplete.
 */
export function normalizeHexColor(value: string): string | undefined {
  const normalized = value.trim().replace(/^#/u, "");
  if (!/^[0-9A-F]{6}$/iu.test(normalized)) return undefined;
  return `#${normalized.toUpperCase()}`;
}
