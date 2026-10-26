/**
 * Clamps one number to an inclusive interval.
 *
 * @param value - Number to constrain.
 * @param minimum - Inclusive lower bound.
 * @param maximum - Inclusive upper bound.
 * @returns Constrained number.
 */
export function clampColorNumber(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Decodes one gamma-compressed sRGB channel into linear light.
 *
 * @param channel - Normalized gamma-compressed sRGB channel.
 * @returns Linear-light channel.
 */
export function decodeSrgbChannel(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

/**
 * Encodes one linear-light channel into gamma-compressed sRGB.
 *
 * @param channel - Linear-light channel.
 * @returns Gamma-compressed sRGB channel.
 */
export function encodeLinearChannel(channel: number): number {
  return channel <= 0.0031308
    ? 12.92 * channel
    : 1.055 * channel ** (1 / 2.4) - 0.055;
}
