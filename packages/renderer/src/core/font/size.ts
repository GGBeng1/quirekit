/**
 * Extracts a CSS pixel font size from a font shorthand.
 * @param font - CSS font shorthand.
 * @returns Pixel size, or null when the shorthand uses unsupported units.
 */
export function parseQuireFontPixelSize(font: string): number | null {
  const match = /(?:^|\s)(\d+(?:\.\d+)?)px(?:\/[^\s]+)?(?:\s|$)/u.exec(font);
  return match?.[1] === undefined ? null : Number(match[1]);
}
