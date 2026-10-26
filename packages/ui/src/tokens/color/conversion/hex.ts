import { clampColorNumber } from "./channels";
import type { QuireSrgbColor } from "./types";

/**
 * Parses a three- or six-digit sRGB hexadecimal color.
 *
 * @param value - Hexadecimal color.
 * @returns Normalized sRGB channels.
 */
export function parseQuireHexColor(value: string): QuireSrgbColor {
  const match = /^#(?<hex>[\da-f]{3}|[\da-f]{6})$/iu.exec(value.trim());
  const source = match?.groups?.hex;
  if (source === undefined) {
    throw new RangeError(`Expected an sRGB hexadecimal color, received: ${value}`);
  }
  const expanded = source.length === 3
    ? [...source].map(expandShortHexCharacter).join("")
    : source;
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16) / 255,
    g: Number.parseInt(expanded.slice(2, 4), 16) / 255,
    b: Number.parseInt(expanded.slice(4, 6), 16) / 255
  };
}

/**
 * Formats normalized sRGB channels as lowercase six-digit hexadecimal.
 *
 * @param color - Normalized sRGB color.
 * @returns Six-digit hexadecimal color.
 */
export function formatQuireHexColor(color: QuireSrgbColor): string {
  return `#${formatHexChannel(color.r)}${formatHexChannel(color.g)}${formatHexChannel(color.b)}`;
}

/**
 * Formats a normalized sRGB color with a controlled alpha.
 *
 * @param color - Normalized sRGB color.
 * @param alpha - Alpha from zero through one.
 * @returns CSS Color 4 rgb value.
 */
export function formatQuireRgbAlpha(color: QuireSrgbColor, alpha: number): string {
  return `rgb(${formatIntegerChannel(color.r)} ${formatIntegerChannel(color.g)} ${formatIntegerChannel(color.b)} / ${Math.round(clampColorNumber(alpha) * 100)}%)`;
}

/**
 * Expands one shorthand hexadecimal character into a full channel pair.
 *
 * @param character - One hexadecimal character from a three-digit color.
 * @returns Two-character full channel representation.
 */
function expandShortHexCharacter(character: string): string {
  return character.repeat(2);
}

/**
 * Formats one normalized sRGB channel as a two-character hexadecimal value.
 *
 * @param value - Normalized sRGB channel.
 * @returns Two-character lowercase hexadecimal channel.
 */
function formatHexChannel(value: number): string {
  return Math.round(clampColorNumber(value) * 255)
    .toString(16)
    .padStart(2, "0");
}

/**
 * Formats one normalized sRGB channel as an integer byte.
 *
 * @param value - Normalized sRGB channel.
 * @returns Integer channel from zero through 255.
 */
function formatIntegerChannel(value: number): number {
  return Math.round(clampColorNumber(value) * 255);
}
