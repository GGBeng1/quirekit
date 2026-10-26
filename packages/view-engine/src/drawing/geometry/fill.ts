import type { DrawingPathFill } from "@quirekit/drawing-geometry";

/**
 * Applies preset face shading before the drawing's independent opacity.
 * @param color - Authored solid color.
 * @param mode - Standard per-path fill mode.
 * @returns Shaded color preserving the input token when no change is needed.
 */
export function resolveDrawingPathFill(color: string | null, mode: DrawingPathFill): string | null {
  if (color === null || mode === "norm" || mode === "none") return color;
  const amount = mode.endsWith("Less") ? 0.2 : 0.4;
  const lighten = mode.startsWith("lighten");
  if (/^#[\da-f]{6}$/i.test(color)) {
    const channels = [1, 3, 5].map(index => Number.parseInt(color.slice(index, index + 2), 16));
    return "#" + channels.map(channel => Math.round(channel * (1 - amount) + (lighten ? 255 * amount : 0)).toString(16).padStart(2, "0")).join("");
  }
  return `color-mix(in srgb, ${color} ${(1 - amount) * 100}%, ${lighten ? "white" : "black"})`;
}
